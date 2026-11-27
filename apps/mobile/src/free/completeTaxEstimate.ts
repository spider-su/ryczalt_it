/** Sequential backend-compatible monthly estimation starting 2026-01.
 * Only classified standard PLN invoices enter the tax engine. Earlier months'
 * payment obligations are assumed settled, but their carry-forwards and YTD
 * contributions still affect the current calculation. */
import type { InvoiceLedger } from "./invoiceLedger";
import type { TaxSettings } from "./taxSettings";
import { settingsForMonth } from "./taxSettings";
import type { MonthlyTaxFacts } from "./monthlyTaxFacts";
import type { InvoiceReview } from "./monthlyInvoiceReview";
import { calculateNativeMonth } from "./tax/monthly";
import { calculateZus, healthBand } from "./tax/zus";

export type CompleteTaxEstimate = {
 missing: string[];
 pitPayablePln?: string;
 vatPayablePln?: string;
 vatCarryForwardPln?: string;
 zusPayableMinor?: string;
 historicalPeriodsAssumedPaid?: boolean;
};
const YYYYMM = /^\d{4}-(0[1-9]|1[0-2])$/;
const amount = (v:string):bigint => BigInt(v);
export function monthsSince2026(target:string):string[] {
 if (!YYYYMM.test(target) || target < "2026-01" || target > "2099-12") throw Error("Invalid tax month");
 const months:string[]=[];
 for(let year=2026;year<=Number(target.slice(0,4));year++)
  for(let m=1;m<=12;m++){
   const key=`${year}-${String(m).padStart(2,"0")}`;
   if(key>target)break;
   months.push(key);
  }
 return months;
}
export function estimateCompleteTaxes(
 ledger:InvoiceLedger,settingsHistory:readonly TaxSettings[],target:string,
 factsByMonth:Readonly<Record<string,MonthlyTaxFacts | null>>,
 reviews:Readonly<Record<string,InvoiceReview>>={},
):CompleteTaxEstimate {
 const missing:string[]=[];
 let vatCreditPln=0n;
 let deductionCarryMinor=0n;
 let ytdRevenue=0n;
 let ytdPaidSocial=0n;
 let taxYear=2026;
 let result:ReturnType<typeof calculateNativeMonth>|null=null;
 for(const month of monthsSince2026(target)){
  const settings=settingsForMonth(settingsHistory,month);
  if(!settings){missing.push("Brak konfiguracji od "+month);break;}
  if(settings.jdgActive===undefined || settings.qualifyingUop===undefined || settings.voluntarySickness===undefined){
   missing.push("Uzupełnij ustawienia ZUS obowiązujące od "+settings.effectiveFrom);break;
  }
  if(!ledger.synchronizedMonths?.[month]){
   missing.push("Brak pełnej synchronizacji KSeF za "+month);break;
  }
  const invoices=ledger.invoices.filter(i=>
    (reviews[i.ksefId]?.accountingMonth??i.issueDate.slice(0,7))===month);
  if(invoices.some(i=>i.currency!=="PLN" || i.kind!=="standard")){
   missing.push("Faktury "+month+" wymagają kursu PLN lub rozliczenia korekt");break;
  }
  if(invoices.some(i=>!reviews[i.ksefId] || reviews[i.ksefId]?.direction!==i.direction)){
   missing.push("Zatwierdź księgowanie faktur KSeF za "+month);break;
  }
  if(invoices.some(i=>i.direction==="received" &&
      (!/^\d+$/.test(reviews[i.ksefId]?.deductibleVatMinor??"") ||
       BigInt(reviews[i.ksefId]?.deductibleVatMinor??"0")>BigInt(i.vatMinor)))){
   missing.push("Zweryfikuj VAT do odliczenia z zakupów za "+month);break;
  }
  const income=invoices.filter(i=>i.direction==="issued");
  if(income.some(i=>amount(i.netMinor)<0n)){missing.push("Ujemny przychód wymaga korekty okresu "+month);break;}
  if(Number(month.slice(0,4))!==taxYear){
   taxYear=Number(month.slice(0,4));ytdRevenue=0n;ytdPaidSocial=0n;
  }
  const revenue=income.reduce((total,i)=>total+amount(i.netMinor),0n);
  ytdRevenue+=revenue;
  const facts=factsByMonth[month];
  if(facts && facts.month!==month){missing.push("Dane rozliczenia nie odpowiadają miesiącowi "+month);break;}
  const zusBase={
   jdgActive:settings.jdgActive,qualifyingUop:settings.qualifyingUop,
   voluntarySickness:settings.voluntarySickness,zusRegime:"JDG" as const,
   ytdRyczaltRevenueMinor:ytdRevenue,
  };
  // This fallback is limited to past months, per the user's explicit paid-history assumption.
  const dueSocial=calculateZus(zusBase).deductibleSocialMinor;
  if(!facts && month===target){
   missing.push("Uzupełnij zapłacone składki w "+month+" (wpisz 0, jeżeli brak)");break;
  }
  const socialPaid=facts?amount(facts.paidZusSocialMinor):dueSocial;
  ytdPaidSocial+=socialPaid;
  const band=healthBand(ytdRevenue>ytdPaidSocial?ytdRevenue-ytdPaidSocial:0n);
  const preZus=calculateZus({...zusBase,explicitHealthBand:band});
  const healthPaid=facts?amount(facts.paidZusHealthMinor):preZus.healthMinor;
  const outputVat=income.reduce((total,i)=>total+amount(i.vatMinor),0n);
  const inputVat=invoices.filter(i=>i.direction==="received")
    .reduce((total,i)=>total+BigInt(reviews[i.ksefId]!.deductibleVatMinor!),0n);
  // 2025 opening VAT credit is zero; subsequent months inherit calculated carry-forward.
  result=calculateNativeMonth({
   revenueByRate:[{rateBasisPoints:1200,revenueMinor:revenue}],
   zus:{...zusBase,explicitHealthBand:band,socialContributionPaidMinor:socialPaid,healthContributionPaidMinor:healthPaid},
   vat:{outputBeforeCorrections:outputVat,salesCorrections:0n,deductibleInput:inputVat,
        adjustments:0n,carryForward:vatCreditPln*100n},
   deductionCarryForward:deductionCarryMinor,
  });
  vatCreditPln=result.vat.carryForward;
  deductionCarryMinor=result.pit.deductionsCarryForwardMinor;
 }
 if(missing.length || !result)return {missing:missing.length?missing:["Brak wyniku rozliczenia"]};
 return {missing:[],pitPayablePln:result.pitPayablePln.toString(),
   vatPayablePln:result.vatPayablePln.toString(),
   vatCarryForwardPln:result.vat.carryForward.toString(),
   zusPayableMinor:result.zusPayableMinor.toString(),
   historicalPeriodsAssumedPaid:target>"2026-01"};
}
