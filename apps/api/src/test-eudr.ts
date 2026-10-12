import "dotenv/config";
import { checkEudrRisk } from "./services/eudr-check.service.js";

// Punjab rice belt coordinates — should return LOW (not a forest)
checkEudrRisk(31.7167, 73.985, "test-farm-id")
  .then((result) => console.log("EUDR result:", result))
  .catch((err) => console.error("Failed:", err));
