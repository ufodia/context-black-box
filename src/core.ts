export type State='exact'|'review'|'missing';
export interface Constraint{id:string;quote:string;sourceStart:number;sourceEnd:number;confirmed:boolean;}
export interface Finding{constraint:Constraint;state:State;candidate:string;reason:string;overlap:number;}
const normalize=(s:string)=>s.normalize('NFKC').toLocaleLowerCase('en').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();
const stop=new Set('a an the to of in on and or is are be for that it this we i you our your with as by at'.split(' '));
const words=(s:string)=>new Set((normalize(s).match(/[\p{L}\p{N}]+/gu)??[]).filter(w=>!stop.has(w)));
const negative=(s:string)=>/(?<![\p{L}\p{N}\p{M}])(?:no|not|never|without|cannot|can't|don't|doesn't|mustn't|shouldn't|won't|false|forbidden|prohibited|asla|değil|hayır)(?![\p{L}\p{N}\p{M}])/iu.test(s);
const negativeMarkers=/(?<![\p{L}\p{N}\p{M}])(?:no|not|never|without|cannot|can't|don't|doesn't|mustn't|shouldn't|won't|false|forbidden|prohibited|asla|değil|hayır)(?![\p{L}\p{N}\p{M}])/giu;
function lowerBound(values:number[],target:number):number{let low=0,high=values.length;while(low<high){const mid=(low+high)>>>1;if(values[mid]<target)low=mid+1;else high=mid;}return low;}
const quantities=(s:string)=>(s.match(/\d+(?:[.,]\d+)*/g)??[]).sort().join('|');
/** Exact textual matches are distinguished from heuristic candidates; no semantic verdict. */
export function analyze(summary:string,constraints:readonly Constraint[]):Finding[]{
  if(summary.length>1_000_000)throw new Error('Summary exceeds the one-million-character limit.');
  const normalizedSummary=normalize(summary);const sentences=summary.split(/(?<=[.!?])\s+|\n+/).map(s=>s.trim()).filter(Boolean);
  // Pre-index clause boundaries and negation positions once. Looking at the
  // full prefix for every repeated quote would become quadratic on long input.
  const leftEnds=[...normalizedSummary.matchAll(/[.;:!?]|\b(?:but|however|yet)\b/gi)].map(m=>m.index!+m[0].length);
  const rightStarts=[...normalizedSummary.matchAll(/[.;:!?]|\b(?:and|or|but|however|yet)\b/gi)].map(m=>m.index!);
  const negationPositions=[...normalizedSummary.matchAll(negativeMarkers)].map(m=>m.index!);
  const hasNegation=(start:number,end:number)=>{const i=lowerBound(negationPositions,start);return i<negationPositions.length&&negationPositions[i]<end;};
  // Index each unique sentence token once. Rules visit only sentences containing
  // one of their words, rather than scanning every word against every sentence.
  const occurrences=new Map<string,number[]>();
  sentences.forEach((sentence,index)=>{for(const word of words(sentence)){const indexes=occurrences.get(word);if(indexes)indexes.push(index);else occurrences.set(word,[index]);}});
  return constraints.map(c=>{
    const quote=normalize(c.quote).replace(/[.!?]+$/,'').trim();if(!quote)return{constraint:c,state:'missing',candidate:'',reason:'Empty rule.',overlap:0};
    // Token boundaries prevent a short quote (e.g. "ship") matching "shipping".
    let negatedMatch='';
    let position=normalizedSummary.indexOf(quote);
    while(position>=0){
        const before=normalizedSummary.slice(Math.max(0,position-2),position),after=normalizedSummary.slice(position+quote.length,position+quote.length+2);
        if(!/[\p{L}\p{N}\p{M}]$/u.test(before)&&!/^[\p{L}\p{N}\p{M}]/u.test(after)){
          // Restrict contextual negation to this clause; an unrelated preceding
          // sentence or contrast ("not X, but Y") must not invert the quote.
          const leftIndex=lowerBound(leftEnds,position+1)-1;
          const leftStart=leftIndex<0?0:leftEnds[leftIndex];
          const afterQuote=position+quote.length;
          const rightIndex=lowerBound(rightStarts,afterQuote);
          const rightEnd=rightIndex===rightStarts.length?normalizedSummary.length:rightStarts[rightIndex];
          if(hasNegation(leftStart,position)||hasNegation(afterQuote,rightEnd)){
            if(!negatedMatch){const start=Math.max(leftStart,position-300),end=Math.min(rightEnd,afterQuote+300);negatedMatch=`${start>leftStart?'…':''}${normalizedSummary.slice(start,end).trim()}${end<rightEnd?'…':''}`;}
          }else return{constraint:c,state:'exact',candidate:c.quote,reason:'The source wording appears in the supplied summary. Check surrounding context before relying on it.',overlap:1};
        }
        position=normalizedSummary.indexOf(quote,position+1);
    }
    if(negatedMatch)return{constraint:c,state:'review',candidate:negatedMatch,reason:'Negation or denial near the quoted wording may change its meaning.',overlap:1};
    const source=words(c.quote),matches=new Map<number,number>();let best='',score=0,bestIndex=Infinity;
    for(const word of source)for(const index of occurrences.get(word)??[])matches.set(index,(matches.get(index)??0)+1);
    for(const[index,common]of matches){const overlap=common/Math.max(source.size,1);if(overlap>score||overlap===score&&index<bestIndex){best=sentences[index];score=overlap;bestIndex=index;}}
    if(score<.45)return{constraint:c,state:'missing',candidate:best,reason:'No close textual candidate found. A different paraphrase may still express this rule.',overlap:score};
    const changes=[];if(negative(c.quote)!==negative(best))changes.push('Negation may have changed.');if(quantities(c.quote)!==quantities(best))changes.push('Numbers may have changed.');
    if(/\b(may|might|could|can)\b/i.test(c.quote)&&/\b(will|must|shall)\b/i.test(best))changes.push('A possibility may have become a commitment.');
    return{constraint:c,state:'review',candidate:best,reason:changes.join(' ')||'Related wording found. A person must check whether the meaning survived.',overlap:score};
  });
}
export function validateConstraints(input:unknown,source:string):Constraint[]{
  if(source.length>1_000_000)throw new Error('Source exceeds the one-million-character limit.');
  if(!Array.isArray(input)||input.length>200)throw new Error('Provide an array of up to 200 source rules.');
  const ids=new Set<string>();
  return input.map(value=>{if(!value||typeof value!=='object')throw new Error('Invalid rule.');const c=value as Record<string,unknown>;
    if(typeof c.id!=='string'||!c.id||ids.has(c.id)||typeof c.quote!=='string'||!c.quote.trim()||c.quote.length>5000||!Number.isInteger(c.sourceStart)||!Number.isInteger(c.sourceEnd))throw new Error('Invalid or duplicate source rule.');
    ids.add(c.id);const start=c.sourceStart as number,end=c.sourceEnd as number;
    if(start<0||end<=start||end>source.length||source.slice(start,end)!==c.quote)throw new Error('A rule no longer matches its exact source excerpt.');
    return{id:c.id,quote:c.quote,sourceStart:start,sourceEnd:end,confirmed:c.confirmed===true};});
}
export function recoveryNote(findings:readonly Finding[],hash:string):string{
  const pending=findings.filter(f=>f.state!=='exact'&&!f.constraint.confirmed);
  return `# Context recovery note\n\nSource SHA-256: \`${hash}\`\n\nThese user-selected excerpts need attention in the next conversation. The comparison is textual and heuristic; review the original intent before acting.\n\n${pending.length?pending.map((f,i)=>`${i+1}. ${f.constraint.quote}\n   Source characters ${f.constraint.sourceStart}–${f.constraint.sourceEnd}; ${f.state==='missing'?'no close match':'review wording'}.`).join('\n\n'):'No unresolved excerpts in this report.'}\n`;
}
export function parseConversation(text:string,filename:string):string{
  if(!filename.toLowerCase().endsWith('.json'))return text;
  const value=JSON.parse(text);const messages=Array.isArray(value)?value:value?.messages;
  if(!Array.isArray(messages))throw new Error('JSON must be an array of messages or an object with a messages array.');
  return messages.map((m:unknown)=>{if(!m||typeof m!=='object')throw new Error('Invalid message.');const row=m as Record<string,unknown>;if(typeof row.content!=='string')throw new Error('Each message must have string content.');return `${typeof row.role==='string'?row.role:'message'}: ${row.content}`;}).join('\n\n');
}
