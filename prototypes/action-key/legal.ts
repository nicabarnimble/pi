import { matchesAction, matchesKey } from "./model.ts";

matchesKey("\u0018", "ctrl+x");
matchesAction("\u0018", "app.message.copy");
matchesAction("\u0003", "app.clear");
