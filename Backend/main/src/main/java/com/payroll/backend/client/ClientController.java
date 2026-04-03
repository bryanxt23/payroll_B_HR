package com.payroll.backend.client;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/clients")
public class ClientController {

    private final ClientRepository repo;

    public ClientController(ClientRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<Client> list() {
        return repo.findAll();
    }

    @PostMapping
    public Client create(@RequestBody Map<String, String> body) {
        String name = body.getOrDefault("name", "").trim();
        if (name.isEmpty()) throw new RuntimeException("Client name is required.");
        return repo.save(new Client(name));
    }

    @PutMapping("/{id}")
    public Client update(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Client client = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Client not found: " + id));
        String name = body.getOrDefault("name", "").trim();
        if (!name.isEmpty()) client.setName(name);
        return repo.save(client);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(@PathVariable Long id) {
        repo.deleteById(id);
        return Map.of("status", "deleted");
    }
}
