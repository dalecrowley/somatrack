export const projectAliases: Record<string, string> = {
    "emoji": "Emoji",
    "treasure": "Project Treasure",
    "project treasure": "Project Treasure",
    "padilla": "CA Padilla",
    "ca padilla": "CA Padilla",
    "piglio": "CA Piglio",
    "ca piglio": "CA Piglio",
    "rainier": "Rainier",
    "pokemon": "PokemonGo",
    "pokemongo": "PokemonGo",
    "pokemon go": "PokemonGo",
    "jupiter": "Jupiter",
    "somatone": "Somatone",
    "project a": "Project A",
    "projecta": "Project A",
    "project b": "Project B",
    "projectb": "Project B",
    "project c": "Project C",
    "projectc": "Project C"
};

export interface EmployeeSheetConfig {
    name: string;
    spreadsheetId: string;
    sheetName: string;
}

// Maps User Email -> Google Sheet Configuration
export const employeeSheets: Record<string, EmployeeSheetConfig> = {
    "dale.crowley@somatone.com": {
        "name": "Dale",
        "spreadsheetId": "1vY3ulH4pEz73dKukjzCcJO7DV4SvVbOskXM_A2wwtC8",
        "sheetName": "Timesheet"
    },
    "marika@somatone.com": {
        "name": "Marika",
        "spreadsheetId": "1x3uVpUEZs_3ShEtqD3ENzIMkUn9De94Ru3z47F78fu0",
        "sheetName": "Timesheet"
    },
    "michael@somatone.com": {
        "name": "Michael",
        "spreadsheetId": "1Cew97F3MsNJ2Hd7jUKn5cksj9-V5MK5l1Hpz8k_kzq4",
        "sheetName": "Timesheet"
    },
    "john@somatone.com": {
        "name": "John",
        "spreadsheetId": "1m3zd5xloZ8_bjFeGiepu8rXPdXADRKqHdE7RGsYMm7Y",
        "sheetName": "Timesheet"
    },
    "saul@somatone.com": {
        "name": "Saul",
        "spreadsheetId": "1AHR8D5zrY1XYIyO9e_JIEsGgs9nBGZz011hL3dUEApo",
        "sheetName": "Timesheet"
    },
    "raul@somatone.com": {
        "name": "Raul",
        "spreadsheetId": "1AF1BcE6mAPEA3AQke6HOhdU3jAGValTEHGDFna-xkFo",
        "sheetName": "Timesheet"
    }
};
