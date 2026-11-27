import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { KsefInvoice } from "./invoiceLedger";
import { saveInvoiceReview, type InvoiceReview } from "./monthlyInvoiceReview";
function toMinor(value:string):bigint {
 const match=/^(\d+)(?:[,.](\d{1,2}))?$/.exec(value.trim());
 if(!match)throw Error("Podaj kwotę VAT do odliczenia, także 0 jeśli brak");
 return BigInt(match[1]!)*100n+BigInt((match[2]??"").padEnd(2,"0"));
}
function toPln(minor:string):string {
 const amount=BigInt(minor);
 return `${amount/100n},${(amount%100n).toString().padStart(2,"0")}`;
}
export function InvoiceReviewEditor({nip,invoice,review,onSaved}:{
 nip:string;invoice:KsefInvoice;review?:InvoiceReview;onSaved:()=>void;
}){
 const [deductible,setDeductible]=useState(review?.deductibleVatMinor===undefined?"":toPln(review.deductibleVatMinor));
 const [accountingMonth,setAccountingMonth]=useState(review?.accountingMonth??invoice.issueDate.slice(0,7));
 useEffect(()=>{
  setDeductible(review?.deductibleVatMinor===undefined?"":toPln(review.deductibleVatMinor));
  setAccountingMonth(review?.accountingMonth??invoice.issueDate.slice(0,7));
 },[review?.deductibleVatMinor,review?.accountingMonth,invoice.issueDate]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 async function approve(){
  setError(null);setBusy(true);
  try{
   if(invoice.kind!=="standard"||invoice.currency!=="PLN")throw Error("Ta faktura wymaga osobnego księgowania");
   if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(accountingMonth)||accountingMonth<"2026-01")
     throw Error("Nieprawidłowy miesiąc księgowania");
   const vat=invoice.direction==="received"?toMinor(deductible):undefined;
   if(vat!==undefined&&(BigInt(invoice.vatMinor)<0n||vat>BigInt(invoice.vatMinor)))
     throw Error("VAT do odliczenia nie może przekraczać VAT faktury");
   await saveInvoiceReview(nip,invoice.issueDate.slice(0,7),{
      ksefId:invoice.ksefId,direction:invoice.direction,accountingMonth,
      ...(vat!==undefined?{deductibleVatMinor:vat.toString()}:{})
   });
   onSaved();
  }catch(e){setError(e instanceof Error?e.message:"Nie można zatwierdzić faktury");}
  finally{setBusy(false);}
 }
 return <View style={{gap:6,paddingTop:6}}>
   <Text style={{fontWeight:"600",color:review?"#047857":"#b45309"}}>
    {review?"Zatwierdzono dane księgowe":"Wymaga zatwierdzenia danych księgowych"}
   </Text>
   <Text>Miesiąc księgowania (RRRR-MM)</Text>
   <TextInput accessibilityLabel="Miesiąc księgowania" value={accountingMonth}
     onChangeText={setAccountingMonth} style={{borderWidth:1,borderColor:"#cbd5e1",padding:8,borderRadius:8}}/>
   {invoice.direction==="received"?<>
     <Text>Potwierdzony VAT do odliczenia (PLN, wpisz 0 jeżeli brak)</Text>
     <TextInput accessibilityLabel="VAT do odliczenia" keyboardType="decimal-pad" value={deductible}
      onChangeText={setDeductible} style={{borderWidth:1,borderColor:"#cbd5e1",padding:8,borderRadius:8}}/>
   </>:<Text>Potwierdź przychód ryczałt 12% i VAT sprzedaży z faktury.</Text>}
   <Pressable accessibilityRole="button" disabled={busy} onPress={()=>void approve()}
    style={{backgroundColor:"#dbeafe",borderRadius:8,padding:10}}>
    <Text style={{fontWeight:"700",color:"#1565c0"}}>{busy?"Zapisywanie…":review?"Zaktualizuj zatwierdzenie":"Zatwierdź księgowanie"}</Text>
   </Pressable>
   {error?<Text accessibilityRole="alert" style={{color:"#b91c1c"}}>{error}</Text>:null}
 </View>;
}
