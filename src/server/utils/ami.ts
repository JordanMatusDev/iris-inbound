import net from "net";
import { EventEmitter } from "events";

export class AmiClient extends EventEmitter {
	private socket: net.Socket | null = null;
	private buffer: string = "";
	private isConnected: boolean = false;

	constructor(
		private host: string,
		private port: number,
		private user: string,
		private pass: string,
	) {
		super();
	}

	public connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.socket = new net.Socket();

			this.socket.connect(this.port, this.host, () => {
				console.log(
					`🔌 Conectado físicamente al puerto AMI ${this.host}:${this.port}`,
				);
				this.login();
			});

			this.socket.on("data", (data) => this.handleData(data));

			this.socket.on("error", (err) => {
				console.error("❌ Error en el socket AMI:", err);
				this.isConnected = false;
				reject(err);
			});

			this.socket.on("close", () => {
				console.log("⚠️ Conexión AMI cerrada.");
				this.isConnected = false;
			});

			this.once("login_success", () => {
				this.isConnected = true;
				resolve();
			});
		});
	}

	private login() {
		const loginAction =
			`Action: Login\r\n` +
			`Username: ${this.user}\r\n` +
			`Secret: ${this.pass}\r\n` +
			`Events: on\r\n\r\n`;

		this.socket?.write(loginAction);
	}

	private handleData(data: Buffer | string) {
		this.buffer += data.toString("utf8");

		const blocks = this.buffer.split("\r\n\r\n");

		this.buffer = blocks.pop() || "";

		for (const block of blocks) {
			this.parseBlock(block);
		}
	}

	private parseBlock(block: string) {
		const lines = block.split("\r\n");
		const eventObj: Record<string, string> = {};

		for (const line of lines) {
			const splitIndex = line.indexOf(":");
			if (splitIndex !== -1) {
				const key = line.substring(0, splitIndex).trim();
				const value = line.substring(splitIndex + 1).trim();
				eventObj[key] = value;
			}
		}

		// Identificar si es una respuesta de Login
		if (
			eventObj["Response"] === "Success" &&
			eventObj["Message"] === "Authentication accepted"
		) {
			console.log("✅ Autenticación AMI exitosa.");
			this.emit("login_success");
		}

		// Emitir eventos específicos de Asterisk
		if (eventObj["Event"]) {
			this.emit("ami_event", eventObj);
			this.emit(`event_${eventObj["Event"]}`, eventObj);
		}
		// Identificar respuestas a comandos (ActionID)
		else if (eventObj["Response"] && eventObj["ActionID"]) {
			this.emit(`response_${eventObj["ActionID"]}`, eventObj);
		}
	}

	/**
	 * Envía una acción a Asterisk y devuelve una Promesa con la respuesta.
	 */
	public sendAction(
		action: Record<string, string>,
	): Promise<Record<string, string>> {
		return new Promise((resolve, reject) => {
			if (!this.isConnected || !this.socket) {
				return reject(new Error("No hay conexión con AMI"));
			}

			const actionId = Math.random().toString(36).substring(2, 15);
			action["ActionID"] = actionId;

			let payload = "";
			for (const [key, value] of Object.entries(action)) {
				payload += `${key}: ${value}\r\n`;
			}
			payload += "\r\n";

			this.once(`response_${actionId}`, (response) => {
				if (response["Response"] === "Error") {
					reject(
						new Error(response["Message"] || "Asterisk devolvió un error"),
					);
				} else {
					resolve(response);
				}
			});

			this.socket.write(payload);
		});
	}

	public disconnect() {
		if (this.socket) {
			this.socket.write(`Action: Logoff\r\n\r\n`);
			this.socket.end();
			this.socket.destroy();
		}
	}
}
