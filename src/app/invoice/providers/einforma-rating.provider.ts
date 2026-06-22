import { BaseRatingService } from 'src/app/invoice/providers/base-rating.provider';

export class EinformaRatingProvider extends BaseRatingService {
  // TODO: Implement the fetchData method to retrieve data from the Einforma API
  async fetchData(): Promise<void> {
    return new Promise((resolve) => {
      this._name = 'Empresa de Ejemplo S.A.';
      this._creationDate = '2012-06-15';
      this._cnae = '6201 - Actividades de programación informática';
      this._sectorRisk = 2;
      this._externScore = 16;
      this._maxExternScoreScale = 20;
      this._creditOpinion = 450000;
      this._averageDelayDays = 18;
      this._overdueAmount = 15000;
      this._legalIncidencesCount = -1;
      this._bankruptcyStatus = false;
      this._lastYearSales = 6200000;
      this._previousYearSales = 5800000;
      this._ebitda = 720000;
      this._netIncome = 310000;
      this._ownFunds = 1850000;
      this._currentAssets = 2400000;
      this._currentLiabilities = 1400000;
      this._totalDebt = 900000;
      this._employeesCount = 42;
      this._lastYearDeposited = 2024;
      this._accountBalanceStatus = true;

      this._age =
        new Date().getFullYear() - new Date(this._creationDate).getFullYear();
      this._standardizedExternScore =
        (this._externScore / this._maxExternScoreScale) * 100;
      this._accountingPeriod =
        new Date().getFullYear() - this._lastYearDeposited;
      this._salesGrowth =
        ((this._lastYearSales - this._previousYearSales) /
          this._previousYearSales) *
        100;
      this._currentLiquidity = this._currentAssets / this._currentLiabilities;
      this._debtOverEquity = this._totalDebt / this._ownFunds;
      this._ebitdaMargin = (this._ebitda / this._lastYearSales) * 100;
      this._netMargin = (this._netIncome / this._lastYearSales) * 100;
      this._estimatedMonthlySales = this._lastYearSales / 12;
      this._workingCapital = this._currentAssets - this._currentLiabilities;
      resolve();
    });
  }
}
