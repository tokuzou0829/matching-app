type ResizeImageOptions = {
	width: number;
	height: number;
	maxBytes: number;
	qualities?: number[];
};

export async function resizeImageFile(file: File, options: ResizeImageOptions) {
	if (!file.type.startsWith("image/")) {
		throw new Error("画像ファイルを選択してください。");
	}

	const image = await loadImageFromFile(file);
	const canvas = document.createElement("canvas");
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("画像の処理に失敗しました。");
	}

	canvas.width = options.width;
	canvas.height = options.height;

	const sourceRatio = image.naturalWidth / image.naturalHeight;
	const targetRatio = options.width / options.height;

	let sourceWidth = image.naturalWidth;
	let sourceHeight = image.naturalHeight;
	let sourceX = 0;
	let sourceY = 0;

	if (sourceRatio > targetRatio) {
		sourceWidth = image.naturalHeight * targetRatio;
		sourceX = (image.naturalWidth - sourceWidth) / 2;
	} else {
		sourceHeight = image.naturalWidth / targetRatio;
		sourceY = (image.naturalHeight - sourceHeight) / 2;
	}

	context.drawImage(
		image,
		sourceX,
		sourceY,
		sourceWidth,
		sourceHeight,
		0,
		0,
		options.width,
		options.height,
	);

	for (const quality of options.qualities ?? [0.82, 0.72, 0.62, 0.55]) {
		const dataUrl = canvas.toDataURL("image/jpeg", quality);
		if (new TextEncoder().encode(dataUrl).length <= options.maxBytes) {
			return dataUrl;
		}
	}

	return canvas.toDataURL("image/jpeg", 0.48);
}

function loadImageFromFile(file: File) {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const objectUrl = URL.createObjectURL(file);
		const image = document.createElement("img");

		image.onload = () => {
			URL.revokeObjectURL(objectUrl);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(new Error("画像を読み込めませんでした。"));
		};

		image.src = objectUrl;
	});
}
