import{describe,it,expect}from'vitest';import{analyze,validateConstraints,recoveryNote,parseConversation,type Constraint}from'../src/core';
const rule=(quote:string):Constraint=>({id:quote,quote,sourceStart:0,sourceEnd:quote.length,confirmed:false});
describe('constraint loss analysis',()=>{
it('recognizes exact text across whitespace and case',()=>{expect(analyze('NEVER  send an email.',[rule('Never send an email.')])[0].state).toBe('exact');});
it('does not confuse substring tokens with exact evidence',()=>{expect(analyze('We are shipping tomorrow.',[rule('ship')])[0].state).not.toBe('exact');});
it('flags lost negation and numerical mutation for review',()=>{const f=analyze('Send an email without approval with budget 3200.',[rule('Never send an email without approval with budget 2400.')])[0];expect(f.state).toBe('review');expect(f.reason).toContain('Numbers');});
it('flags a possibility becoming a commitment',()=>{const f=analyze('We will deliver the guide by Friday.',[rule('We may deliver the guide by Friday.')])[0];expect(f.state).toBe('review');expect(f.reason).toContain('commitment');});
it('distinguishes missing wording from verified semantic absence',()=>{const f=analyze('Prepare a launch schedule.',[rule('Keep customer files on this computer.')])[0];expect(f.state).toBe('missing');expect(f.reason).toContain('may still');});
it('requires exact source provenance and unique ids',()=>{const c=rule('Never send.');expect(validateConstraints([c],'Never send.')).toEqual([c]);expect(()=>validateConstraints([c],'Please send.')).toThrow(/excerpt/);expect(()=>validateConstraints([c,c],'Never send.')).toThrow(/duplicate/);});
it('bounds the source text as well as the summary',()=>{expect(()=>validateConstraints([], 'x'.repeat(1_000_001))).toThrow(/limit/);expect(()=>analyze('x'.repeat(1_000_001),[])).toThrow(/limit/);});
it('exports only unresolved excerpts and retains source offsets',()=>{const list=analyze('',[rule('Never send.')]);expect(recoveryNote(list,'abc')).toContain('Source characters 0–11');list[0].constraint.confirmed=true;expect(recoveryNote(list,'abc')).toContain('No unresolved');});
it('imports the documented JSON message shape and rejects nested/non-text messages',()=>{expect(parseConversation('{"messages":[{"role":"user","content":"Hello"}]}','a.json')).toBe('user: Hello');expect(()=>parseConversation('{"messages":[{"content":[] }]}','a.json')).toThrow(/string content/);});
});
