import { IRatingService } from 'src/app/invoice/interfaces/rating-provider.interface';

export abstract class BaseRatingService implements IRatingService {
  protected _name: string;
  protected _taxId: string; // CIF (texto)
  protected _creationDate: string; // Fecha constitución (fecha)
  protected _cnae: string; // Sector (texto)
  protected _sectorRisk: number; // Riesgo sector (entero)
  protected _externScore: number; // Nota externa (valor bruto) (entero)
  protected _maxExternScoreScale: number; // Escala máxima nota externa (entero)
  protected _creditOpinion: number; // Opinión de crédito (€)
  protected _averageDelayDays: number; // Días medios de demora (días)
  protected _overdueAmount: number; // Importe morosidad registrado (€)
  protected _legalIncidencesCount: number; // Incidencias judiciales (#) (entero)
  protected _bankruptcyStatus: boolean; // Situación concursal (si/no)
  protected _lastYearSales: number; // Ventas último año (€)
  protected _previousYearSales: number; // Ventas año anterior (€)
  protected _ebitda: number; // EBITDA (€)
  protected _netIncome: number; // Resultado neto (€)
  protected _ownFunds: number; // Fondos propios (€)
  protected _currentAssets: number; // Activo corriente (€)
  protected _currentLiabilities: number; // Pasivo corriente (€)
  protected _totalDebt: number; // Deuda financiera total (€)
  protected _employeesCount: number; // Empleados (nº)
  protected _lastYearDeposited: number; // Último año depositado (año)
  protected _accountBalanceStatus: boolean; // Cuentas al día (si/no)

  // Derived metrics
  protected _age: number; // Antigüedad empresa (años)
  protected _standardizedExternScore: number; // Nota externa normalizada (0-100)
  protected _accountingPeriod: number; // Recencia cuentas (años)
  protected _salesGrowth: number; // Crecimiento ventas (%)
  protected _currentLiquidity: number; // Liquidez corriente (x)
  protected _debtOverEquity: number; // Deuda / fondos propios (x)
  protected _ebitdaMargin: number; // Margen EBITDA (%)
  protected _netMargin: number; // Margen neto (%)
  protected _estimatedMonthlySales: number; // Ventas mensuales estimadas (€ / mes)
  protected _workingCapital: number; // Fondo de maniobra (€)

  constructor({ companyId }: { companyId: string }) {
    this._taxId = companyId;
  }

  fetchData(): Promise<void> {
    throw new Error(
      'Method not implemented. Please implement the fetchData method in the subclass.',
    );
  }

  get name(): string {
    return this._name;
  }

  get taxId(): string {
    return this._taxId;
  }

  get creationDate(): string {
    return this._creationDate;
  }

  get cnae(): string {
    return this._cnae;
  }

  get sectorRisk(): number {
    return this._sectorRisk;
  }

  get externScore(): number {
    return this._externScore;
  }

  get maxExternScoreScale(): number {
    return this._maxExternScoreScale;
  }

  get creditOpinion(): number {
    return this._creditOpinion;
  }

  get averageDelayDays(): number {
    return this._averageDelayDays;
  }

  get overdueAmount(): number {
    return this._overdueAmount;
  }

  get legalIncidencesCount(): number {
    return this._legalIncidencesCount;
  }

  get bankruptcyStatus(): boolean {
    return this._bankruptcyStatus;
  }

  get lastYearSales(): number {
    return this._lastYearSales;
  }

  get previousYearSales(): number {
    return this._previousYearSales;
  }

  get ebitda(): number {
    return this._ebitda;
  }

  get netIncome(): number {
    return this._netIncome;
  }

  get ownFunds(): number {
    return this._ownFunds;
  }

  get currentAssets(): number {
    return this._currentAssets;
  }

  get currentLiabilities(): number {
    return this._currentLiabilities;
  }

  get totalDebt(): number {
    return this._totalDebt;
  }

  get employeesCount(): number {
    return this._employeesCount;
  }

  get lastYearDeposited(): number {
    return this._lastYearDeposited;
  }

  get accountBalanceStatus(): boolean {
    return this._accountBalanceStatus;
  }

  get age(): number {
    return this._age;
  }

  get standardizedExternScore(): number {
    return this._standardizedExternScore;
  }

  get accountingPeriod(): number {
    return this._accountingPeriod;
  }

  get salesGrowth(): number {
    return this._salesGrowth;
  }

  get currentLiquidity(): number {
    return this._currentLiquidity;
  }

  get debtOverEquity(): number {
    return this._debtOverEquity;
  }

  get ebitdaMargin(): number {
    return this._ebitdaMargin;
  }

  get netMargin(): number {
    return this._netMargin;
  }

  get estimatedMonthlySales(): number {
    return this._estimatedMonthlySales;
  }

  get workingCapital(): number {
    return this._workingCapital;
  }
}
