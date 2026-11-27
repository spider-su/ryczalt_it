import * as FS from "expo-file-system/legacy";
import { Platform } from "react-native";

export type InvoiceReview = {
 ksefId:string; direction:"issued"|"received"; accountingMonth:string;
 deductibleVatMinor?:string; // required for received invoices, including explicit zero
};
export type MonthInvoiceReviews = Record<string,InvoiceReview>;
const MONTH=/^\d{4}-(0[1-9]|1[0-2])$/;
const NIP=/^\d{10}$/;
const MONEY=/^\d+$/;
function file(nip:string,month:string):string {
 if(!NIP.test(nip)||!MONTH.test(month)||month<"2026-01")throw Error("Invalid invoice accounting period");
 if(Platform.OS==="web"||!FS.documentDirectory)throw Error("Native storage required");
 return FS.documentDirectory+"RyczaltIT/"+nip+"/"+month.slice(0,4)+"/"+month.slice(5)+"/invoice-review.json";
}
function validate(review:InvoiceReview):void {
 if(!/^[A-Za-z0-9-]{1,160}$/.test(review.ksefId)||!MONTH.test(review.accountingMonth)||
    review.accountingMonth<"2026-01"||!["issued","received"].includes(review.direction))
   throw Error("Invalid invoice accounting review");
 if(review.direction==="received"&&!MONEY.test(review.deductibleVatMinor??""))
   throw Error("Deductible purchase VAT must be explicitly confirmed, including zero");
 if(review.direction==="issued"&&review.deductibleVatMinor!==undefined)
   throw Error("Sales invoice must not have deductible VAT");
}
export async function loadMonthInvoiceReviews(nip:string,month:string):Promise<MonthInvoiceReviews>{
 const path=file(nip,month);
 if(!(await FS.getInfoAsync(path)).exists)return {};
 const parsed=JSON.parse(await FS.readAsStringAsync(path)) as MonthInvoiceReviews;
 if(!parsed||Array.isArray(parsed)||typeof parsed!=="object")throw Error("Invalid invoice review data");
 for(const [key,value] of Object.entries(parsed)){
   validate(value);
   if(value.ksefId!==key)throw Error("Invoice review ID mismatch");
 }
 return parsed;
}
export async function saveInvoiceReview(nip:string,issueMonth:string,review:InvoiceReview):Promise<void>{
 validate(review);
 const path=file(nip,issueMonth);
 const previous=await loadMonthInvoiceReviews(nip,issueMonth);
 const next={...previous,[review.ksefId]:review};
 const folder=path.slice(0,path.lastIndexOf("/")+1);
 await FS.makeDirectoryAsync(folder,{intermediates:true});
 const temp=path+".tmp";
 await FS.writeAsStringAsync(temp,JSON.stringify(next));
 const backup=path+".bak";
 const exists=(await FS.getInfoAsync(path)).exists;
 if(exists)await FS.moveAsync({from:path,to:backup});
 try{
   await FS.moveAsync({from:temp,to:path});
   if(exists)await FS.deleteAsync(backup,{idempotent:true});
 }catch(error){
   await FS.deleteAsync(temp,{idempotent:true});
   if(exists&&!(await FS.getInfoAsync(path)).exists)await FS.moveAsync({from:backup,to:path});
   throw error;
 }
}
