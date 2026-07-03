import mongoose from "mongoose";
import { Var } from "./models/Var.js";
import { Config } from "../config.js";

let isConnected = false;

export const connectDB = async () => {
    if (isConnected) return;
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
        console.log("No MONGO_URL provided, skipping database connection.");
        return;
    }
    
    try {
        const db = await mongoose.connect(mongoUrl);
        isConnected = db.connections[0].readyState === 1;
        console.log("MongoDB connected successfully");
        
        // Load custom vars into env and Config
        const vars = await Var.find({});
        for (const v of vars) {
            process.env[v.key] = v.value;
            // Best effort config update
            if (v.key === "CMD_TRIGGER") Config.CMD_TRIGGER = v.value;
            if (v.key === "SUDO_TRIGGER") Config.SUDO_TRIGGER = v.value;
            if (v.key === "PUBLIC_TRIGGER") Config.PUBLIC_TRIGGER = v.value;
            if (v.key === "TELEGRAM_LOG_CHANNEL") Config.LOG_CHANNEL_ID = parseInt(v.value) || 0;
            // add more as needed
        }
        console.log("Loaded custom vars from DB");
    } catch (error) {
        console.error("MongoDB connection error:", error);
    }
};
