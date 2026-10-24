"""Owned browser command transport. Never request or log Studio raw values."""
import json, pathlib, sys, time, uuid, datetime
out=pathlib.Path(__file__).parent
command={'id':uuid.uuid4().hex,'action':sys.argv[1]}
if command['action']=='evaluate': command['expression']=sys.argv[2]
if command['action']=='screenshot':
    command['name']=sys.argv[2]
    if len(sys.argv)>3: command['viewport']={'width':int(sys.argv[3]),'height':int(sys.argv[4])}
(out/'qa-command.json').write_text(json.dumps(command),encoding='utf-8')
for _ in range(1800):
    try:
        result=json.loads((out/'visual-result.json').read_text(encoding='utf-8'))
        response=result.get('lastCommand',{})
        if response.get('id')==command['id']:
            record={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds'),'command':command,'result':response}
            with (out/'runtime-observations.ndjson').open('a',encoding='utf-8') as f:f.write(json.dumps(record,ensure_ascii=False)+'\n')
            print(json.dumps(response,ensure_ascii=False,indent=2));sys.exit(1 if 'error' in response else 0)
    except (FileNotFoundError,json.JSONDecodeError):pass
    time.sleep(0.1)
raise SystemExit('OWNED_BROWSER_COMMAND_TIMEOUT')
