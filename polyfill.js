// polyfill.js
import "react-native-get-random-values";
import { install } from "react-native-quick-crypto";
import "react-native-url-polyfill/auto";
import { Buffer } from "@craftzdog/react-native-buffer";

global.Buffer = Buffer;

// ----------------------------------------------------------------------------
// 1. PATCH: Fix subarray and slice to return Buffers
// ----------------------------------------------------------------------------
const originalSubarray = Buffer.prototype.subarray;
Buffer.prototype.subarray = function subarray(begin, end) {
	const result = originalSubarray.call(this, begin, end);
	if (!(result instanceof Buffer)) {
		Object.setPrototypeOf(result, Buffer.prototype);
	}
	return result;
};

const originalSlice = Buffer.prototype.slice;
Buffer.prototype.slice = function slice(begin, end) {
	const result = originalSlice
		? originalSlice.call(this, begin, end)
		: Uint8Array.prototype.slice.call(this, begin, end);
	if (!(result instanceof Buffer)) {
		Object.setPrototypeOf(result, Buffer.prototype);
	}
	return result;
};

// ----------------------------------------------------------------------------
// 2. PATCH: Inject Buffer methods into Uint8Array
// This fixes "b.readIntLE is not a function" errors when SDKs get raw Uint8Arrays
// ----------------------------------------------------------------------------
const bufferMethods = [
	"readDoubleBE",
	"readDoubleLE",
	"readFloatBE",
	"readFloatLE",
	"readInt8",
	"readInt16BE",
	"readInt16LE",
	"readInt32BE",
	"readInt32LE",
	"readUInt8",
	"readUInt16BE",
	"readUInt16LE",
	"readUInt32BE",
	"readUInt32LE",
	"readBigInt64BE",
	"readBigInt64LE",
	"readBigUInt64BE",
	"readBigUInt64LE",
	"readIntBE",
	"readIntLE",
	"readUIntBE",
	"readUIntLE",
    "writeUInt8",
    "writeUInt16LE",
    "writeUInt32LE",
    "writeUIntBE",
    "writeUIntLE",
    "copy",
    "fill"
];

bufferMethods.forEach((method) => {
	if (!Uint8Array.prototype[method]) {
		Uint8Array.prototype[method] = function (...args) {
			// Cast this Uint8Array to a Buffer (view, no copy if possible)
			// @craftzdog/react-native-buffer Buffer.from(ab, off, len) creates a view
			const buf = Buffer.from(this.buffer, this.byteOffset, this.byteLength);
			return buf[method].apply(buf, args);
		};
	}
});

// Fix .equals() specifically
if (!Uint8Array.prototype.equals) {
	Uint8Array.prototype.equals = function (b) {
		if (!b) return false;
		if (this.length !== b.length) return false;
		for (let i = 0; i < this.length; i++) {
			if (this[i] !== b[i]) return false;
		}
		return true;
	};
}

install();
