import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const region = process.env["AWS_REGION"] || "us-east-1";
const accessKeyId = process.env["AWS_ACCESS_KEY_ID"];
const secretAccessKey = process.env["AWS_SECRET_ACCESS_KEY"];
const bucket = process.env["AWS_S3_BUCKET"];

const s3Client = new S3Client({
	region,
	credentials: {
		accessKeyId: accessKeyId || "",
		secretAccessKey: secretAccessKey || "",
	},
});

type Mode = "inbound" | "outbound";

export async function uploadAudioToS3(
	fileName: string,
	fileBuffer: Buffer,
	mode: Mode,
): Promise<string | null> {
	// Validamos el bucket antes de intentar nada
	if (!bucket || !accessKeyId || !secretAccessKey) {
		console.error(
			"❌ No se puede subir a S3: Faltan credenciales o el nombre del bucket en el .env",
		);
		return null;
	}

	const s3Key = `recordings/${mode}/${fileName}`;

	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: s3Key,
		Body: fileBuffer,
		ContentType: "audio/wav",
	});

	try {
		await s3Client.send(command);

		// Retornamos la ruta S3 (S3 URI)
		return `s3://${bucket}/${s3Key}`;
	} catch (error) {
		console.error(
			`❌ Falló la subida a S3 para el archivo ${fileName}:`,
			error,
		);
		return null;
	}
}
