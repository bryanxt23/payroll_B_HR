package com.payroll.backend.inventory;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;
    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;

    public CloudinaryService(
            @Value("${cloudinary.cloud-name}") String cloudName,
            @Value("${cloudinary.api-key}")    String apiKey,
            @Value("${cloudinary.api-secret}") String apiSecret) {
        this.cloudName = cloudName;
        this.apiKey    = apiKey;
        this.apiSecret = apiSecret;
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key",    apiKey,
                "api_secret", apiSecret,
                "secure",     true));
    }

    /** Upload a file to the "inventory" folder and return the secure URL. */
    public String upload(MultipartFile file) throws IOException {
        return upload(file, "inventory");
    }

    /** Upload a file to a specific folder and return the secure URL. */
    public String upload(MultipartFile file, String folder) throws IOException {
        Map<?, ?> result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap("folder", folder, "resource_type", "auto"));
        return (String) result.get("secure_url");
    }

    /**
     * Upload an IMAGE to a specific folder with a fixed filename.
     * Uses resource_type "image" — publicly accessible URL.
     */
    public String uploadWithPublicId(MultipartFile file, String folder, String filename) throws IOException {
        Map<?, ?> result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder",        folder,
                        "public_id",     filename,
                        "resource_type", "image",
                        "overwrite",     true,
                        "invalidate",    true));
        return (String) result.get("secure_url");
    }

    /**
     * Upload a RAW file (PDF, Word, etc.) to a specific folder with a fixed filename.
     * resource_type "raw" + access_mode "public" = publicly accessible direct URL.
     */
    public String uploadRawWithPublicId(MultipartFile file, String folder, String filename) throws IOException {
        Map<?, ?> result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder",        folder,
                        "public_id",     filename,
                        "resource_type", "raw",
                        "access_mode",   "public",
                        "overwrite",     true,
                        "invalidate",    true));
        return (String) result.get("secure_url");
    }

    /**
     * Delete an image from Cloudinary by its URL.
     * Silently ignores errors (e.g. already deleted, non-Cloudinary URL).
     */
    public void deleteByUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) return;
        if (!imageUrl.contains("res.cloudinary.com")) return;
        try {
            // Strip version and path prefix, then remove extension
            String path = imageUrl.replaceAll(".*/upload/(v\\d+/)?", "");
            String publicId = path.replaceAll("\\.[^.]+$", "");
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (Exception ignored) {}
    }

    /**
     * Delete an image from Cloudinary by its public_id (e.g. "inventory/bracelet").
     * Also invalidates the CDN cache so a subsequent upload with the same
     * id is served fresh. Silently ignores errors.
     */
    public void deleteByPublicId(String publicId) {
        if (publicId == null || publicId.isBlank()) return;
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("invalidate", true));
        } catch (Exception ignored) {}
    }

    /**
     * Scan the inventory/ folder, group assets by their original filename,
     * and delete every duplicate except the most recently created one in
     * each group. Assets currently referenced by the application database
     * (via {@code keepUrls}) are always preserved, even if they are not
     * the newest in their group, so we never break a live inventory row.
     *
     * @param keepUrls secure URLs that must NOT be deleted regardless of
     *                 their age. Pass the URLs currently stored on
     *                 InventoryItem rows.
     * @return summary map: scanned, groups, deleted, kept, removedPublicIds, errors
     */
    public Map<String, Object> cleanupInventoryDuplicates(Set<String> keepUrls) {
        Map<String, Object> result = new LinkedHashMap<>();
        List<String> removed = new ArrayList<>();
        List<String> errors  = new ArrayList<>();

        // Build a set of public_ids that are still referenced by the DB.
        Set<String> protectedIds = new HashSet<>();
        if (keepUrls != null) {
            for (String url : keepUrls) {
                String pid = publicIdFromUrl(url);
                if (pid != null) protectedIds.add(pid);
            }
        }

        // 1. Page through every asset in the inventory/ folder.
        List<Map<String, Object>> all = new ArrayList<>();
        String nextCursor = null;
        try {
            do {
                Map<String, Object> params = new HashMap<>();
                params.put("type", "upload");
                params.put("prefix", "inventory/");
                params.put("max_results", 500);
                if (nextCursor != null) params.put("next_cursor", nextCursor);

                @SuppressWarnings("unchecked")
                Map<String, Object> page = cloudinary.api().resources(params);
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> resources = (List<Map<String, Object>>) page.get("resources");
                if (resources != null) all.addAll(resources);
                nextCursor = (String) page.get("next_cursor");
            } while (nextCursor != null);
        } catch (Exception e) {
            result.put("error", "Failed to list assets: " + e.getMessage());
            return result;
        }

        // 2. Group by original_filename (case-insensitive). Cloudinary keeps
        //    this field even when the public_id was randomized, so it's the
        //    best signal for "same source file uploaded multiple times".
        Map<String, List<Map<String, Object>>> groups = new LinkedHashMap<>();
        for (Map<String, Object> r : all) {
            String original = (String) r.get("original_filename");
            if (original == null || original.isBlank()) {
                // Fall back to the public_id's last segment (without random
                // prefix) so files lacking the field still group sensibly.
                String pid = (String) r.get("public_id");
                original = pid != null ? pid.replaceAll(".*/", "") : "";
            }
            String key = original.toLowerCase();
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(r);
        }

        // 3. For each group, keep the newest by created_at + anything in
        //    protectedIds; delete the rest.
        int kept = 0;
        for (Map.Entry<String, List<Map<String, Object>>> e : groups.entrySet()) {
            List<Map<String, Object>> assets = e.getValue();
            if (assets.size() <= 1) {
                kept += assets.size();
                continue;
            }
            // Newest first.
            assets.sort((a, b) -> {
                String ca = (String) a.get("created_at");
                String cb = (String) b.get("created_at");
                if (ca == null) ca = "";
                if (cb == null) cb = "";
                return cb.compareTo(ca);
            });
            String newestId = (String) assets.get(0).get("public_id");
            for (int i = 0; i < assets.size(); i++) {
                String pid = (String) assets.get(i).get("public_id");
                if (pid == null) continue;
                boolean isNewest    = pid.equals(newestId);
                boolean isProtected = protectedIds.contains(pid);
                if (isNewest || isProtected) {
                    kept++;
                    continue;
                }
                try {
                    cloudinary.uploader().destroy(pid, ObjectUtils.asMap("invalidate", true));
                    removed.add(pid);
                } catch (Exception ex) {
                    errors.add(pid + ": " + ex.getMessage());
                }
            }
        }

        result.put("scanned",          all.size());
        result.put("groups",           groups.size());
        result.put("deleted",          removed.size());
        result.put("kept",             kept);
        result.put("removedPublicIds", removed);
        result.put("errors",           errors);
        return result;
    }

    /**
     * Extract the Cloudinary public_id from a secure delivery URL.
     * Returns null if the URL doesn't look like a Cloudinary asset.
     */
    private static String publicIdFromUrl(String url) {
        if (url == null || url.isBlank()) return null;
        if (!url.contains("res.cloudinary.com")) return null;
        // Strip query string and the /upload/(v123/) prefix, then drop the
        // file extension. Result: "inventory/bracelet".
        String clean = url.replaceAll("\\?.*$", "");
        String path  = clean.replaceAll(".*/upload/(v\\d+/)?", "");
        return path.replaceAll("\\.[^.]+$", "");
    }

    /**
     * Builds an authenticated Admin API download URL for the stored asset.
     * Uses HMAC-SHA256 signing with the API secret — works regardless of
     * account-level CDN access restrictions.
     *
     * Endpoint: https://api.cloudinary.com/v1_1/{cloud}/raw/download
     *           or       /image/download for image resources.
     */
    public String buildApiDownloadUrl(String storedUrl) throws Exception {
        boolean isRaw   = storedUrl.contains("/raw/upload/");
        String resource = isRaw ? "raw" : "image";
        // public_id has no extension — strip version prefix only
        String publicId = storedUrl.replaceAll(".*/upload/(v\\d+/)?", "");
        long timestamp  = System.currentTimeMillis() / 1000L;

        String toSign    = "public_id=" + publicId + "&timestamp=" + timestamp + apiSecret;
        String signature = sha1Hex(toSign);

        return "https://api.cloudinary.com/v1_1/" + cloudName + "/" + resource + "/download"
                + "?public_id=" + URLEncoder.encode(publicId, StandardCharsets.UTF_8)
                + "&timestamp=" + timestamp
                + "&api_key=" + apiKey
                + "&signature=" + signature;
    }

    private static String sha1Hex(String data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-1");
        byte[] raw = md.digest(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : raw) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
