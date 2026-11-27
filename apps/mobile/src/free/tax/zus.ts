/** Pure port of backend ZusCalculator / ZusRuleSet, using PLN grosz.
 * 2026 values match TestTaxRules and database seed V01.001. */
export type HealthBand = "LOW" | "MEDIUM" | "HIGH";
export type ZusRules = {
 version: string; socialInsuranceMinor: bigint; labourFundMinor: bigint; sicknessMinor: bigint;
 healthLowRevenueMinor: bigint; healthMediumRevenueMinor: bigint;
 healthLowMinor: bigint; healthMediumMinor: bigint; healthHighMinor: bigint;
};
export const ZUS_2026: ZusRules = {
 version:"ZUS_2026_POC_V1",socialInsuranceMinor:164982n,labourFundMinor:13847n,sicknessMinor:13847n,
 healthLowRevenueMinor:6000000n,healthMediumRevenueMinor:30000000n,
 healthLowMinor:49835n,healthMediumMinor:83058n,healthHighMinor:149504n,
};
export type ZusInput = {
 jdgActive:boolean;qualifyingUop:boolean;zusRegime:"JDG";voluntarySickness:boolean;
 ytdRyczaltRevenueMinor:bigint;
 fullJdgSocialMinor?:bigint;explicitHealthBand?:HealthBand;
 socialContributionPaidMinor?:bigint;
 healthContributionOverrideMinor?:bigint;
 healthContributionPaidMinor?:bigint;
};
export type ZusResult = {
 socialMinor:bigint;healthMinor:bigint;healthPaidForDeductionMinor:bigint;
 totalMinor:bigint;deductibleSocialMinor:bigint;healthBand:HealthBand;
 reason:"UOP_PRIMARY_INSURANCE"|"JDG_PRIMARY_INSURANCE";ruleVersion:string;
};
function nonnegative(value:bigint, name:string):bigint {if(value<0n)throw Error(name+" must not be negative");return value;}
export function healthBand(ytdMinusPaidSocial:bigint,rules:ZusRules=ZUS_2026):HealthBand {
 if(ytdMinusPaidSocial<=rules.healthLowRevenueMinor)return "LOW";
 return ytdMinusPaidSocial<=rules.healthMediumRevenueMinor?"MEDIUM":"HIGH";
}
export function calculateZus(input:ZusInput,rules:ZusRules=ZUS_2026):ZusResult {
 if(input.zusRegime!=="JDG")throw Error("Unsupported ZUS regime");
 if(input.voluntarySickness&&(!input.jdgActive||input.qualifyingUop))
   throw Error("Voluntary sickness supported only for JDG primary insurance");
 nonnegative(input.ytdRyczaltRevenueMinor,"YTD revenue");
 const fullSocial=nonnegative(input.fullJdgSocialMinor??rules.socialInsuranceMinor+rules.labourFundMinor,"Full social");
 const band=input.explicitHealthBand??healthBand(input.ytdRyczaltRevenueMinor,rules);
 if(!(["LOW","MEDIUM","HIGH"] as string[]).includes(band))throw Error("Unsupported health band");
 const primary=input.jdgActive&&!input.qualifyingUop;
 const social=primary?fullSocial+(input.voluntarySickness?rules.sicknessMinor:0n):0n;
 const maxDeductible=primary?fullSocial-rules.labourFundMinor+(input.voluntarySickness?rules.sicknessMinor:0n):0n;
 const paidSocial=nonnegative(input.socialContributionPaidMinor??maxDeductible,"Paid social");
 const deductibleSocial=paidSocial<maxDeductible?paidSocial:maxDeductible;
 const standardHealth=band==="LOW"?rules.healthLowMinor:band==="MEDIUM"?rules.healthMediumMinor:rules.healthHighMinor;
 const health=input.jdgActive?nonnegative(input.healthContributionOverrideMinor??standardHealth,"Health"):0n;
 const healthPaid=nonnegative(input.healthContributionPaidMinor??health,"Paid health");
 return {socialMinor:social,healthMinor:health,healthPaidForDeductionMinor:healthPaid,
  totalMinor:social+health,deductibleSocialMinor:deductibleSocial,healthBand:band,
  reason:input.qualifyingUop?"UOP_PRIMARY_INSURANCE":"JDG_PRIMARY_INSURANCE",ruleVersion:rules.version};
}
