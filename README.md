![logo](./resources/email-process-output.png)
# Email prosess output

### Install
```bash
$ npm i -g email-process-output
```

### Usage
```bash
$ email-process-output --help
Usage: email-process-output [OPTONS] COMMAND [...ARGS]
Options:
    --username username - GMail account
    --password pass-or-file - password or filepath cotaining password
    --config config-file - json file having default options
    --from sender - like "User Name" <user.name@gmail.com>
    --to recipients - comma separated list
    --cc recipients - comma separated list
    --bcc hidden-recipients - comma separated list
    --replyTo reply-adderss - like "Cron" <automat@gmail.com>
    --subject subject - default value is command with args
    --template template - "prefix HTML code {} suffix HTML code"
    --ignore success|empty - do not send email if process not exited with error code or if process does not produce any output
    --echo echo stdout and stderr (disable quite mode)
    
```

### Limits
Currently supports sending email just via Gmail.