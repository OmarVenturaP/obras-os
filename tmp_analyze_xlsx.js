const XLSX = require('xlsx');
const workbook = XLSX.readFile('/Users/ventura/Desktop/Programacion/recal-hse/public/plantillas/09_FUERZA_TRABAJO.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
console.log(JSON.stringify(data[0])); // Headers are usually in the first row
