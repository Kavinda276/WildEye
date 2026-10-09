import app from "./app";
import config from "./config";
import connectDB from "./config/db";

const startServer = async (): Promise<void> => {
  await connectDB();

  app.listen(config.port, () => {
    console.log(
      `WildEye server running in ${config.nodeEnv} mode on port ${config.port}`
    );
  });
};

startServer();
