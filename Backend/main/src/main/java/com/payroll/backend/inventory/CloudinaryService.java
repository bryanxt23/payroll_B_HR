package com.payroll.backend.inventory;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(
            @Value("${cloudinary.cloud-name}") String cloudName,
            @Value("${cloudinary.api-key}")    String apiKey,
            @Value("${cloudinary.api-secret}") String apiSecret) {
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
     * Upload to a specific folder with a fixed filename (public_id).
     * Folder and filename must be passed separately — Cloudinary requires this
     * to correctly create the folder hierarchy in the Media Library.
     * overwrite:true  — replaces the asset if it already exists
     * invalidate:true — purges CDN cache so the new file is served immediately
     *
     * folder   example: "payroll_B_HR_1/harry/Profile"
     * filename example: "photo"
     */
    public String uploadWithPublicId(MultipartFile file, String folder, String filename) throws IOException {
        Map<?, ?> result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder",        folder,
                        "public_id",     filename,
                        "resource_type", "auto",
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
            String publicId = extractPublicId(imageUrl);
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (Exception ignored) {}
    }

    /**
     * Extract the Cloudinary public_id from a secure URL.
     * Example: https://res.cloudinary.com/demo/image/upload/v1234/inventory/abc.jpg
     *          → inventory/abc
     */
    private String extractPublicId(String url) {
        String afterUpload = url.replaceAll(".*/image/upload/(v\\d+/)?", "");
        return afterUpload.replaceAll("\\.[^.]+$", "");
    }
}
