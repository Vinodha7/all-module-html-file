package com.cts.pharmaTrack.module.identityAccessManagement.controller;

import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.ApiResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.Product;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/pharmaTrack/identityAccess")
public class ProductController {

    private static final Logger logger = LoggerFactory.getLogger(ProductController.class);
    private final ProductRepository productRepository;

    public ProductController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @PostMapping("/products")
    public ResponseEntity<ApiResponse<Product>> createProduct(@RequestBody Product product) {
        logger.info("POST /products request received for product: {}", product.getProductName());
        if (product.getProductName() == null || product.getProductName().trim().isEmpty()) {
            throw new IllegalArgumentException("Product name is required");
        }
        if (product.getStorageCondition() == null || product.getStorageCondition().trim().isEmpty()) {
            throw new IllegalArgumentException("Storage condition is required");
        }
        if (product.getMinThreshold() == null || product.getMaxThreshold() == null) {
            throw new IllegalArgumentException("Threshold limits are required");
        }
        Product saved = productRepository.save(product);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Product created successfully", saved));
    }

    @GetMapping("/products")
    public ResponseEntity<ApiResponse<List<Product>>> fetchProducts() {
        logger.info("GET /products request received");
        List<Product> products = productRepository.findAll();
        return ResponseEntity.ok(ApiResponse.success("Products fetched", products));
    }
}
