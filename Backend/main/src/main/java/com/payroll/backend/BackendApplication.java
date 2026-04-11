package com.payroll.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class BackendApplication {
	public static void main(String[] args) {
		// Render runs the JVM in UTC by default. Force Philippine time so
		// LocalDateTime.now() / LocalDate.now() (used by payments, activity
		// logs, dashboard "Today Sales", etc.) match the user's local day.
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Manila"));
		System.setProperty("user.timezone", "Asia/Manila");
		SpringApplication.run(BackendApplication.class, args);
	}
}
