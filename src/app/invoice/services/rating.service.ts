import { Injectable } from '@nestjs/common';
import { BaseRatingService } from 'src/app/invoice/providers/base-rating.provider';
import { EinformaRatingProvider } from 'src/app/invoice/providers/einforma-rating.provider';
import { RatingDecision } from 'src/app/invoice/enums/rating-decision.enum';
import { RatingInvoiceEnum } from 'src/app/invoice/enums/rating-invoice.enum';

@Injectable()
export class RatingService {
  private _ratingProvider: BaseRatingService;

  // Rating weights company
  private _weightsCompany: {
    standardizedExternScore: number; // Nota externa normalizada + actualidad de cuentas
    paymentBehavior: number; // Demora + morosidad + judicial/concursal
    solvencyAndLiquidity: number; // Liquidez + apalancamiento + margen
    sizeAndStability: number; // Ventas + antigüedad + crecimiento + empleados + sector
  } = {
    // TODO: load from config
    standardizedExternScore: 0.3,
    paymentBehavior: 0.25,
    solvencyAndLiquidity: 0.25,
    sizeAndStability: 0.2,
  };

  // Rating weights invoice
  private _weightsInvoice: {
    companyOverInvoice: number; // Peso rating empresa en rating factura
    effort: number; // Peso esfuerzo factura
    creditOpinion: number; // Importe / opinión de crédito
    monthlySales: number; // Importe / ventas mensuales
    workingCapital: number; // Importe / fondo de maniobra
    term: number; // Plazo de la factura
  } = {
    // TODO: load from config
    companyOverInvoice: 0.7,
    effort: 0.3,
    creditOpinion: 0.35,
    monthlySales: 0.25,
    workingCapital: 0.2,
    term: 0.2,
  };

  // Score company
  private _scoreCompany: {
    accountBalanceStatusScore: number; // Score actualidad de cuentas
    externScore: number; // Score externo
    daysPastDueScore: number; // Score días de demora
    delinquencyScore: number; // Score morosidad
    legalBankruptcyIncidentsScore: number; // Score incidencias judiciales / concurso
    paymentBehavior: number; // Comportamiento de pago
    currentLiquidityScore: number; // Score liquidez corriente
    debtOverEquityScore: number; // Score deuda / fondos propios
    ebitdaMarginScore: number; // Score margen EBITDA
    solvencyAndLiquidity: number; // Solvencia y liquidez
    salesScore: number; // Score ventas
    ageScore: number; // Score antigüedad
    salesGrowthScore: number; // Score crecimiento ventas
    employeesScore: number; // Score empleados
    sectorRiskScore: number; // Score riesgo sector
    sizeAndStability: number; // Tamaño y estabilidad
    grossCompanyScore: number; // Score empresa bruto
    finalCompanyScore: number; // Score empresa final
    companyRating: number; // Rating empresa (1-10)
    companyDecision: RatingDecision; // Decisión empresa
  };

  // Input invoice
  private _invoiceIssueDate: Date;
  private _invoiceDueDate: Date;
  private _invoiceAmount: number;

  private _scoreInvoice: {
    dueDays: number; // Días plazo (nª días)
    creditOpinion: number; // Importe / Opinión crédito (%)
    yearSales: number; // Importe / Ventas anuales (%)
    monthlySales: number; // Importe / Ventas mensuales (%)
    workingCapital: number; // Importe / Fondo maniobra (%)
    cupoScore: number; // Score cupo (0-100)
    monthlySalesScore: number; // Score ventas mens. (0-100)
    workingCapitalScore: number; // Score fondo maniobra (0-100)
    dueDaysScore: number; // Score plazo (0-100)
    effortScore: number; // Score esfuerzo factura (0-100)
    finalInvoiceScore: number; // Score factura final (0-100)
    invoiceRating: RatingInvoiceEnum; // Rating (AAA,AA,A,BBB,BB,B,CCC)
    invoiceDecision: RatingDecision; // Decisión
  };

  async eval({
    companyId,
    invoiceIssueDate,
    invoiceDueDate,
    invoiceAmount,
  }: {
    companyId: string;
    invoiceIssueDate: string;
    invoiceDueDate: string;
    invoiceAmount: number;
  }) {
    this._ratingProvider = new EinformaRatingProvider({ companyId });
    this._invoiceIssueDate = new Date(invoiceIssueDate);
    this._invoiceDueDate = new Date(invoiceDueDate);
    this._invoiceAmount = invoiceAmount;

    // TODO: try catch {}
    // Input company
    await this._ratingProvider.fetchData();

    // Scores have cross-dependencies, so we compute and persist them in order.
    this._scoreCompany = {} as typeof this._scoreCompany;
    this._scoreCompany.accountBalanceStatusScore =
      this.get_cAccountsCurrentStatusScore();
    this._scoreCompany.externScore = this.get_cExternScore();
    this._scoreCompany.daysPastDueScore = this.get_cDaysPastDueScore();
    this._scoreCompany.delinquencyScore = this.get_cDelinquencyScore();
    this._scoreCompany.legalBankruptcyIncidentsScore =
      this.get_cLegalBankruptcyIncidentsScore();
    this._scoreCompany.paymentBehavior = this.get_cPaymentBehavior();
    this._scoreCompany.currentLiquidityScore = this.get_cCurrentLiquidityScore();
    this._scoreCompany.debtOverEquityScore = this.get_cDebtOverEquityScore();
    this._scoreCompany.ebitdaMarginScore = this.get_cEbitdaMarginScore();
    this._scoreCompany.solvencyAndLiquidity = this.get_cSolvencyAndLiquidity();
    this._scoreCompany.salesScore = this.get_cSalesScore();
    this._scoreCompany.ageScore = this.get_cAgeScore();
    this._scoreCompany.salesGrowthScore = this.get_cSalesGrowthScore();
    this._scoreCompany.employeesScore = this.get_cEmployeesScore();
    this._scoreCompany.sectorRiskScore = this.get_cSectorRiskScore();
    this._scoreCompany.sizeAndStability = this.get_cSizeAndStability();
    this._scoreCompany.grossCompanyScore = this.get_cGrossCompanyScore();
    this._scoreCompany.finalCompanyScore = this.get_cFinalCompanyScore();
    this._scoreCompany.companyRating = this.get_cCompanyRating();
    this._scoreCompany.companyDecision = this.get_cCompanyDecision();

    this._scoreInvoice = {} as typeof this._scoreInvoice;
    this._scoreInvoice.dueDays = this.get_iDueDays();
    this._scoreInvoice.creditOpinion = this.get_iCreditOpinion();
    this._scoreInvoice.yearSales = this.get_iYearSales();
    this._scoreInvoice.monthlySales = this.get_iMonthlySales();
    this._scoreInvoice.workingCapital = this.get_iWorkingCapital();
    this._scoreInvoice.cupoScore = this.get_iCupoScore();
    this._scoreInvoice.monthlySalesScore = this.get_iMonthlySalesScore();
    this._scoreInvoice.workingCapitalScore = this.get_iWorkingCapitalScore();
    this._scoreInvoice.dueDaysScore = this.get_iDueDaysScore();
    this._scoreInvoice.effortScore = this.get_iEffortScore();
    this._scoreInvoice.finalInvoiceScore = this.get_iFinalInvoiceScore();
    this._scoreInvoice.invoiceRating = this.get_iInvoiceRating();
    this._scoreInvoice.invoiceDecision = this.get_iInvoiceDecision();

    return {
      finalCompanyScore: this._scoreCompany.finalCompanyScore,
      companyRating: this._scoreCompany.companyRating,
      companyDecision: this._scoreCompany.companyDecision,
      finalInvoiceScore: this._scoreInvoice.finalInvoiceScore,
      invoiceRating: this._scoreInvoice.invoiceRating,
      invoiceDecision: this._scoreInvoice.invoiceDecision,
    };
  }

  private getScore<T extends number | RatingDecision | RatingInvoiceEnum>(
    scores: T[],
    conditions: boolean[],
  ): T {
    for (let i = 0; i < conditions.length; i++) {
      if (conditions[i]) return scores[i];
    }
    return scores[scores.length - 1];
  }

  private get_cAccountsCurrentStatusScore() {
    const accountBalanceStatusScores = [100, 85, 70, 40, 10];
    const accountBalanceStatusConditions = [
      this._ratingProvider.accountBalanceStatus,
      this._ratingProvider.accountingPeriod <= 1,
      this._ratingProvider.accountingPeriod <= 2,
      this._ratingProvider.accountingPeriod <= 3,
    ];

    return this.getScore(
      accountBalanceStatusScores,
      accountBalanceStatusConditions,
    );
  }

  private get_cExternScore() {
    const externScores = [
      0.8 * this._ratingProvider.externScore +
        0.2 * this._scoreCompany.accountBalanceStatusScore,
    ];
    const externScoreConditions = [];

    return this.getScore(externScores, externScoreConditions);
  }

  private get_cDaysPastDueScore() {
    const daysPastDueScores = [100, 85, 65, 40, 15];
    const daysPastDueConditions = [
      this._ratingProvider.averageDelayDays <= 0,
      this._ratingProvider.averageDelayDays <= 15,
      this._ratingProvider.averageDelayDays <= 30,
      this._ratingProvider.averageDelayDays <= 60,
    ];

    return this.getScore(daysPastDueScores, daysPastDueConditions);
  }

  private get_cDelinquencyScore() {
    const delinquencyScores = [100, 20, 75, 40, 10];
    const delinquencyConditions = [
      this._ratingProvider.overdueAmount == 0,
      this._ratingProvider.ownFunds <= 0,
      this._ratingProvider.overdueAmount / this._ratingProvider.ownFunds <=
        0.02,
      this._ratingProvider.overdueAmount / this._ratingProvider.ownFunds <= 0.1,
    ];

    return this.getScore(delinquencyScores, delinquencyConditions);
  }

  private get_cLegalBankruptcyIncidentsScore() {
    const legalBankruptcyIncidentsScores = [0, 100, 60, 35, 10];
    const legalBankruptcyIncidentsConditions = [
      this._ratingProvider.bankruptcyStatus,
      this._ratingProvider.legalIncidencesCount == 0,
      this._ratingProvider.legalIncidencesCount == 1,
      this._ratingProvider.legalIncidencesCount <= 3,
    ];

    return this.getScore(
      legalBankruptcyIncidentsScores,
      legalBankruptcyIncidentsConditions,
    );
  }

  private get_cPaymentBehavior() {
    const paymentBehaviorScores = [
      0.4 * this._scoreCompany.daysPastDueScore +
        0.35 * this._scoreCompany.delinquencyScore +
        0.25 * this._scoreCompany.legalBankruptcyIncidentsScore,
    ];
    const paymentBehaviorConditions = [];

    return this.getScore(paymentBehaviorScores, paymentBehaviorConditions);
  }

  private get_cCurrentLiquidityScore() {
    const currentLiquidityScores = [100, 80, 60, 35, 10];
    const currentLiquidityConditions = [
      this._ratingProvider.currentLiquidity >= 1.5,
      this._ratingProvider.currentLiquidity >= 1.2,
      this._ratingProvider.currentLiquidity >= 1,
      this._ratingProvider.currentLiquidity >= 0.8,
    ];

    return this.getScore(currentLiquidityScores, currentLiquidityConditions);
  }

  private get_cDebtOverEquityScore() {
    const debtOverEquityScores = [100, 80, 55, 30, 10];
    const debtOverEquityConditions = [
      this._ratingProvider.debtOverEquity <= 0.5,
      this._ratingProvider.debtOverEquity <= 1,
      this._ratingProvider.debtOverEquity <= 2,
      this._ratingProvider.debtOverEquity <= 4,
    ];

    return this.getScore(debtOverEquityScores, debtOverEquityConditions);
  }

  private get_cEbitdaMarginScore() {
    const ebitdaMarginScores = [100, 80, 60, 40, 10];
    const ebitdaMarginConditions = [
      this._ratingProvider.ebitdaMargin >= 0.12,
      this._ratingProvider.ebitdaMargin >= 0.08,
      this._ratingProvider.ebitdaMargin >= 0.04,
      this._ratingProvider.ebitdaMargin >= 0,
    ];

    return this.getScore(ebitdaMarginScores, ebitdaMarginConditions);
  }

  private get_cSolvencyAndLiquidity() {
    const solvencyAndLiquidityScores = [
      0.35 * this._scoreCompany.currentLiquidityScore +
        0.35 * this._scoreCompany.debtOverEquityScore +
        0.3 * this._scoreCompany.ebitdaMarginScore,
    ];
    const solvencyAndLiquidityConditions = [];

    return this.getScore(
      solvencyAndLiquidityScores,
      solvencyAndLiquidityConditions,
    );
  }

  private get_cSalesScore() {
    const salesScores = [100, 80, 60, 40, 20];
    const salesConditions = [
      this._ratingProvider.lastYearSales >= 20000000,
      this._ratingProvider.lastYearSales >= 5000000,
      this._ratingProvider.lastYearSales >= 1000000,
      this._ratingProvider.lastYearSales >= 250000,
    ];

    return this.getScore(salesScores, salesConditions);
  }

  private get_cAgeScore() {
    const ageScores = [100, 80, 60, 40, 20];
    const ageConditions = [
      this._ratingProvider.age >= 10,
      this._ratingProvider.age >= 5,
      this._ratingProvider.age >= 2,
      this._ratingProvider.age >= 1,
    ];

    return this.getScore(ageScores, ageConditions);
  }

  private get_cSalesGrowthScore() {
    const salesGrowthScores = [100, 75, 50, 25];
    const salesGrowthConditions = [
      this._ratingProvider.salesGrowth >= 0.1,
      this._ratingProvider.salesGrowth >= 0,
      this._ratingProvider.salesGrowth >= -0.1,
    ];

    return this.getScore(salesGrowthScores, salesGrowthConditions);
  }

  private get_cEmployeesScore() {
    const employeesScores = [100, 80, 60, 40, 20];
    const employeesConditions = [
      this._ratingProvider.employeesCount >= 250,
      this._ratingProvider.employeesCount >= 50,
      this._ratingProvider.employeesCount >= 10,
      this._ratingProvider.employeesCount >= 1,
    ];

    return this.getScore(employeesScores, employeesConditions);
  }

  private get_cSectorRiskScore() {
    const sectorRiskScores = [100, 80, 60, 40, 20];
    const sectorRiskConditions = [
      this._ratingProvider.sectorRisk == 1,
      this._ratingProvider.sectorRisk == 2,
      this._ratingProvider.sectorRisk == 3,
      this._ratingProvider.sectorRisk == 4,
    ];

    return this.getScore(sectorRiskScores, sectorRiskConditions);
  }

  private get_cSizeAndStability() {
    const sizeAndStabilityScores = [
      0.3 * this._scoreCompany.salesScore +
        0.25 * this._scoreCompany.ageScore +
        0.2 * this._scoreCompany.salesGrowthScore +
        0.15 * this._scoreCompany.employeesScore +
        0.1 * this._scoreCompany.sectorRiskScore,
    ];
    const sizeAndStabilityConditions = [];

    return this.getScore(sizeAndStabilityScores, sizeAndStabilityConditions);
  }

  private get_cGrossCompanyScore() {
    const grossCompanyScores = [
      this._weightsCompany.standardizedExternScore *
        this._scoreCompany.externScore +
        this._weightsCompany.paymentBehavior *
          this._scoreCompany.paymentBehavior +
        this._weightsCompany.solvencyAndLiquidity *
          this._scoreCompany.solvencyAndLiquidity +
        this._weightsCompany.sizeAndStability *
          this._scoreCompany.sizeAndStability,
    ];
    const grossCompanyConditions = [];

    return this.getScore(grossCompanyScores, grossCompanyConditions);
  }

  private get_cFinalCompanyScore() {
    const finalCompanyScores = [
      Math.min(this._scoreCompany.grossCompanyScore, 10),
      Math.min(this._scoreCompany.grossCompanyScore, 35),
      this._scoreCompany.grossCompanyScore,
    ];
    const finalCompanyConditions = [
      this._ratingProvider.bankruptcyStatus,
      this._ratingProvider.overdueAmount > 0 &&
        this._ratingProvider.averageDelayDays > 60,
    ];

    return this.getScore(finalCompanyScores, finalCompanyConditions);
  }

  private get_cCompanyRating() {
    const companyRatingScores = [
      Math.round((this._scoreCompany.finalCompanyScore / 100) * 10),
    ];
    const companyRatingConditions = [];

    return this.getScore(companyRatingScores, companyRatingConditions);
  }

  private get_cCompanyDecision() {
    const companyDecisions = [
      RatingDecision.APPROVE,
      RatingDecision.REVIEW,
      RatingDecision.REJECT,
    ];
    const companyDecisionConditions = [
      this._scoreCompany.finalCompanyScore >= 70,
      this._scoreCompany.companyRating >= 50,
    ];

    return this.getScore(companyDecisions, companyDecisionConditions);
  }

  private get_iDueDays() {
    const dueDaysScores = [
      this._invoiceDueDate.getTime() -
        this._invoiceIssueDate.getTime() / (1000 * 3600 * 24),
    ];
    const dueDaysConditions = [];

    return this.getScore(dueDaysScores, dueDaysConditions);
  }

  private get_iCreditOpinion() {
    const creditOpinionScores = [
      this._invoiceAmount / this._ratingProvider.creditOpinion,
    ];
    const creditOpinionConditions = [];

    return this.getScore(creditOpinionScores, creditOpinionConditions);
  }

  private get_iYearSales() {
    const yearSalesScores = [
      this._invoiceAmount / this._ratingProvider.previousYearSales,
      0,
    ];
    const yearSaleConditions = [this._ratingProvider.previousYearSales > 0];

    return this.getScore(yearSalesScores, yearSaleConditions);
  }

  private get_iMonthlySales() {
    const monthlySalesScores = [
      this._invoiceAmount / this._ratingProvider.estimatedMonthlySales,
      0,
    ];
    const monthlySaleConditions = [
      this._ratingProvider.estimatedMonthlySales > 0,
    ];

    return this.getScore(monthlySalesScores, monthlySaleConditions);
  }

  private get_iWorkingCapital() {
    const workingCapitalScores = [
      9.99,
      this._invoiceAmount / this._ratingProvider.workingCapital,
    ];
    const workingCapitalConditions = [this._ratingProvider.workingCapital <= 0];

    return this.getScore(workingCapitalScores, workingCapitalConditions);
  }

  private get_iCupoScore() {
    const cupoScores = [100, 80, 60, 40, 15];
    const cupoConditions = [
      this._scoreInvoice.creditOpinion <= 0.25,
      this._scoreInvoice.creditOpinion <= 0.5,
      this._scoreInvoice.creditOpinion <= 1,
      this._scoreInvoice.creditOpinion <= 1.25,
    ];

    return this.getScore(cupoScores, cupoConditions);
  }

  private get_iMonthlySalesScore() {
    const monthlySalesScores = [100, 80, 60, 35, 15];
    const monthlySaleConditions = [
      this._scoreInvoice.monthlySales <= 0.25,
      this._scoreInvoice.monthlySales <= 0.5,
      this._scoreInvoice.monthlySales <= 1,
      this._scoreInvoice.monthlySales <= 2,
    ];

    return this.getScore(monthlySalesScores, monthlySaleConditions);
  }

  private get_iWorkingCapitalScore() {
    const workingCapitalScores = [100, 80, 50, 20];
    const workingCapitalConditions = [
      this._scoreInvoice.workingCapital <= 0.25,
      this._scoreInvoice.workingCapital <= 0.5,
      this._scoreInvoice.workingCapital <= 1,
    ];

    return this.getScore(workingCapitalScores, workingCapitalConditions);
  }

  private get_iDueDaysScore() {
    const dueDaysScores = [100, 85, 65, 45, 20];
    const dueDaysConditions = [
      this._scoreInvoice.dueDays <= 30,
      this._scoreInvoice.dueDays <= 60,
      this._scoreInvoice.dueDays <= 90,
      this._scoreInvoice.dueDays <= 120,
    ];

    return this.getScore(dueDaysScores, dueDaysConditions);
  }

  private get_iEffortScore() {
    const effortScores = [
      this._scoreInvoice.cupoScore * this._weightsInvoice.creditOpinion +
        this._scoreInvoice.monthlySalesScore *
          this._weightsInvoice.monthlySales +
        this._scoreInvoice.workingCapitalScore *
          this._weightsInvoice.workingCapital +
        this._scoreInvoice.dueDaysScore * this._weightsInvoice.term,
    ];
    const effortConditions = [];

    return this.getScore(effortScores, effortConditions);
  }

  private get_iFinalInvoiceScore() {
    const finalInvoiceScores = [
      Math.min(
        this._weightsInvoice.companyOverInvoice *
          this._scoreCompany.finalCompanyScore,
        this._weightsInvoice.effort * this._scoreInvoice.effortScore,
        10,
      ),
      Math.min(
        this._weightsInvoice.companyOverInvoice *
          this._scoreCompany.finalCompanyScore,
        this._weightsInvoice.effort * this._scoreInvoice.effortScore,
        45,
      ),
      Math.min(
        this._weightsInvoice.companyOverInvoice *
          this._scoreCompany.finalCompanyScore,
        this._weightsInvoice.effort * this._scoreInvoice.effortScore,
      ),
    ];
    const finalInvoiceConditions = [
      this._ratingProvider.bankruptcyStatus,
      this._scoreInvoice.creditOpinion > 1,
    ];

    return this.getScore(finalInvoiceScores, finalInvoiceConditions);
  }

  private get_iInvoiceRating() {
    const invoiceScores = [
      RatingInvoiceEnum.AAA,
      RatingInvoiceEnum.AA,
      RatingInvoiceEnum.A,
      RatingInvoiceEnum.BBB,
      RatingInvoiceEnum.BB,
      RatingInvoiceEnum.B,
      RatingInvoiceEnum.CCC,
    ];
    const invoiceConditions = [
      this._scoreInvoice.finalInvoiceScore >= 90,
      this._scoreInvoice.finalInvoiceScore >= 80,
      this._scoreInvoice.finalInvoiceScore >= 70,
      this._scoreInvoice.finalInvoiceScore >= 60,
      this._scoreInvoice.finalInvoiceScore >= 50,
      this._scoreInvoice.finalInvoiceScore >= 35,
    ];

    return this.getScore(invoiceScores, invoiceConditions);
  }

  private get_iInvoiceDecision() {
    const invoiceDecisionScores = [
      RatingDecision.APPROVE,
      RatingDecision.REVIEW,
      RatingDecision.REJECT,
    ];
    const invoiceDecisionConditions = [
      this._scoreInvoice.finalInvoiceScore >= 70,
      this._scoreInvoice.finalInvoiceScore >= 50,
    ];

    return this.getScore(invoiceDecisionScores, invoiceDecisionConditions);
  }
}
