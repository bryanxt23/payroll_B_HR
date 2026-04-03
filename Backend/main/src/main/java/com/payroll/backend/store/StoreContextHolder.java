package com.payroll.backend.store;

public class StoreContextHolder {

    private static final ThreadLocal<Long> STORE_ID  = new ThreadLocal<>();
    private static final ThreadLocal<Long> CLIENT_ID = new ThreadLocal<>();

    public static void setStoreId(Long id)  { STORE_ID.set(id); }
    public static void setClientId(Long id) { CLIENT_ID.set(id); }

    public static Long getStoreId() {
        Long id = STORE_ID.get();
        return (id != null) ? id : 1L;
    }

    public static Long getClientId() { return CLIENT_ID.get(); }

    public static void clear() { STORE_ID.remove(); CLIENT_ID.remove(); }
}
