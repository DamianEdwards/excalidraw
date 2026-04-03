// Aspire TypeScript AppHost
// For more information, see: https://aspire.dev

import { createBuilder, refExpr } from './.modules/aspire.js';

const builder = await createBuilder({ dashboardApplicationName: "excalidraw" });

// const compose = await builder.addDockerComposeEnvironment("compose");
const aca = await builder.addAzureContainerAppEnvironment("aca");

const room = await builder
  .addNodeApp("room", "../../excalidraw-room", "dist/index.js")
  .withYarn()
  .withRunScript("start:dev")
  .withBuildScript("build")
  .withHttpEndpoint({ env: "PORT" });

const roomEndpoint = await room.getEndpoint("http");

const isRunMode = await (await builder.executionContext.get()).isRunMode.get();
const appPorts = isRunMode ? { port: 5173, isProxied: false } : { targetPort: 5000 };
const appArgs = isRunMode ? ["--port", appPorts.port!.toString()] : [];

const excalidraw = await builder
  .addJavaScriptApp("excalidraw", "../", { runScriptName: "start" })
  .withHttpEndpoint({ env: "PORT", ...appPorts })
  .withArgs(appArgs)
  .withYarn()
  .withBuildScript("build")
  .withEnvironment("BROWSER", "none")
  .withEnvironment("VITE_APP_WS_SERVER_URL", "")
  .withEnvironmentEndpoint("VITE_APP_ROOM_URL", roomEndpoint)
  .withExternalHttpEndpoints()
  .publishAsDockerFileWithConfigure(async (container) => {
    await container.withDockerfile("../", { dockerfilePath: "Dockerfile.aspire" });
    // Configure YARP reverse proxy routes for the room server
    await container.withEnvironment("REVERSEPROXY__ROUTES__socketio__MATCH__PATH", "/socket.io/{**catch-all}");
    await container.withEnvironment("REVERSEPROXY__ROUTES__socketio__CLUSTERID", "room");
    await container.withEnvironmentEndpoint("REVERSEPROXY__CLUSTERS__room__DESTINATIONS__default__ADDRESS", roomEndpoint);
  });

const allowAnonymous = true;
const tunnel = await builder
  .addDevTunnel("tunnel")
  .withTunnelReferenceAll(excalidraw, allowAnonymous)
  .withAnonymousAccess();

await builder.build().run();
