import { ClientDisconnectedError } from "../../collaborative/session";
import { DEFAULT_FONT, DEFAULT_FONT_SIZE } from "../../constants";
import { AlternatingColorGenerator } from "../../helpers";
import { Client, ClientPosition, Color, GridRenderingContext, UID } from "../../types";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

interface ClientToDisplay extends Required<Client> {
  color: Color;
}

export class CollaborativePlugin extends UIPlugin {
  static getters = [
    "getClientsToDisplay",
    "getClient",
    "getConnectedClients",
    "isFullySynchronized",
  ] as const;
  static layers = ["Selection"] as const;
  private availableColors = new AlternatingColorGenerator(12);
  private colors: Record<UID, Color> = {};
  private session: UIPluginConfig["session"];

  constructor(config: UIPluginConfig) {
    super(config);
    this.session = config.session;
  }

  private isPositionValid(position: ClientPosition): boolean {
    return (
      position.row < this.getters.getNumberRows(position.sheetId) &&
      position.col < this.getters.getNumberCols(position.sheetId)
    );
  }

  getClient() {
    return this.session.getClient();
  }

  getConnectedClients() {
    return this.session.getConnectedClients();
  }

  isFullySynchronized() {
    return this.session.isFullySynchronized();
  }

  /**
   * Get the list of others connected clients which are present in the same sheet
   * and with a valid position
   */
  getClientsToDisplay(): ClientToDisplay[] {
    try {
      this.getters.getClient();
    } catch (e) {
      if (e instanceof ClientDisconnectedError) {
        return [];
      } else {
        throw e;
      }
    }
    const sheetId = this.getters.getActiveSheetId();
    const clients: ClientToDisplay[] = [];
    for (const client of this.getters.getConnectedClients()) {
      if (
        client.id !== this.getters.getClient().id &&
        client.position &&
        client.position.sheetId === sheetId &&
        this.isPositionValid(client.position)
      ) {
        const position = client.position;
        if (!this.colors[client.id]) {
          this.colors[client.id] = this.availableColors.next();
        }
        const color = this.colors[client.id];
        clients.push({ ...client, position, color });
      }
    }
    return clients;
  }

  drawLayer(renderingContext: GridRenderingContext) {
    if (this.getters.isDashboard()) {
      return;
    }
    const { ctx, thinLineWidth } = renderingContext;

    const activeSheetId = this.getters.getActiveSheetId();
    for (const client of this.getClientsToDisplay()) {
      const { row, col } = client.position!;
      const zone = this.getters.expandZone(activeSheetId, {
        top: row,
        bottom: row,
        left: col,
        right: col,
      });
      const { x, y, width, height } = this.getters.getVisibleRect(zone);
      if (width <= 0 || height <= 0) {
        continue;
      }
      const color = client.color;
      /* Cell background */
      ctx.fillStyle = `${color}10`;
      ctx.lineWidth = 4 * thinLineWidth;
      ctx.strokeStyle = color;
      ctx.globalCompositeOperation = "multiply";
      ctx.fillRect(x, y, width, height);
      /* Cell border */
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeRect(x, y, width, height);
      /* client name background */
      ctx.font = `bold ${DEFAULT_FONT_SIZE + 1}px ${DEFAULT_FONT}`;
    }
  }
}
