import { matchesAction } from "./model.ts";

matchesAction("\u0018", "ctrl+x");
matchesAction("\u0018", "app.not.a.binding");
