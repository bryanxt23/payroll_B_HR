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
import java.util.Map;

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
