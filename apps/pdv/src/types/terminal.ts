export interface PdvTerminalConfig {
  paired: boolean;
  terminalId: string;
  terminalName: string;
  cashierNumber: number;
  code: string;
  token?: string;
  company: {
    id: string;
    name: string;
    document: string;
  };
  store: {
    id: string;
    name: string;
    code: string;
    tradeName?: string;
    city?: string | null;
    state?: string | null;
  };
  apiUrl: string;
}
