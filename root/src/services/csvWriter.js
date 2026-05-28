import fs from 'fs';
import { createObjectCsvWriter } from 'csv-writer';

export async function writeCsv(filePath, data) {
if (!data.length) return;

const headers = Object.keys(data[0]).map(key => ({
id: key,
title: key
}));

const writer = createObjectCsvWriter({
path: filePath,
header: headers
});

await writer.writeRecords(data);
}
