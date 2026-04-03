// Aspire TypeScript AppHost
// For more information, see: https://aspire.dev

import { createBuilder } from './.modules/aspire.js';

const builder = await createBuilder({ dashboardApplicationName: "excalidraw" });

const compose = await builder.addDockerComposeEnvironment("compose");

const room = await builder
  .addNodeApp("room", "../../excalidraw-room", "dist/index.js")
  .withYarn()
  .withRunScript("start:dev")
  .withBuildScript("build")
  .withHttpEndpoint({ env: "PORT" });

const roomEndpoint = await room.getEndpoint("http");

const excalidraw = await builder
  .addViteApp("excalidraw", "../excalidraw-app", { runScriptName: "start" })
  .withYarn()
  .withEnvironment("BROWSER", "none")
  .withEnvironment("VITE_APP_WS_SERVER_URL", roomEndpoint);

await builder.build().run();
