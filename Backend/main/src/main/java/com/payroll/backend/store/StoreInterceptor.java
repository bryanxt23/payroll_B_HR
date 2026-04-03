package com.payroll.backend.store;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class StoreInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {
        String storeHeader = request.getHeader("X-Store-Id");
        Long storeId = 1L;
        if (storeHeader != null && !storeHeader.isBlank()) {
            try { storeId = Long.parseLong(storeHeader); }
            catch (NumberFormatException ignored) {}
        }
        StoreContextHolder.setStoreId(storeId);

        String clientHeader = request.getHeader("X-Client-Id");
        if (clientHeader != null && !clientHeader.isBlank()) {
            try { StoreContextHolder.setClientId(Long.parseLong(clientHeader)); }
            catch (NumberFormatException ignored) {}
        }

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler,
                                Exception ex) {
        StoreContextHolder.clear();
    }
}
