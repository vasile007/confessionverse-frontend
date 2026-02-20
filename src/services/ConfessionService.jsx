// src/services/ConfessionService.jsx
import api from "../api";

export async function getConfessions() {
    try {
        const { data } = await api.get("/confessions/my");
        return data;
    } catch (error) {
        console.error("Error fetching confessions:", error);
        return [];
    }
}

export async function createConfession(confession) {
    try {
        const { data } = await api.post("/confessions", confession);
        return data;
    } catch (error) {
        console.error("Error creating confession:", error);
        return null;
    }
}

