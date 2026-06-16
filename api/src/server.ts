import dotenv from "dotenv";
import { app } from "./app.js";
import { startMonitorScheduler } from "./jobs/monitorScheduler.js";

dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API is running on http://localhost:${PORT}`);

  startMonitorScheduler();
});
