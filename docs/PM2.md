# Deploying with PM2

The package supports pm2 out-of-the-box, so you can easily use it to scale processes:

```bash
$ pm2 start bin/pm2.js --name=echo-server -i max
```

You can also easily scale the processes in and out:

```bash
$ pm2 scale echo-server 5
```

```
┌─────┬────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name           │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ echo-server    │ default     │ 1.1.0   │ cluster │ 10132    │ 3m     │ 0    │ online    │ 0%       │ 49.4mb   │ vagrant  │ disabled │
│ 1   │ echo-server    │ default     │ 1.1.0   │ cluster │ 10139    │ 3m     │ 0    │ online    │ 0%       │ 50.0mb   │ vagrant  │ disabled │
│ 2   │ echo-server    │ default     │ 1.1.0   │ cluster │ 10248    │ 2m     │ 0    │ online    │ 0%       │ 49.4mb   │ vagrant  │ disabled │
│ 3   │ echo-server    │ default     │ 1.1.0   │ cluster │ 10828    │ 28s    │ 0    │ online    │ 0%       │ 48.4mb   │ vagrant  │ disabled │
│ 4   │ echo-server    │ default     │ 1.1.0   │ cluster │ 10835    │ 28s    │ 0    │ online    │ 0%       │ 48.1mb   │ vagrant  │ disabled │
└─────┴────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

**Remember, if you are scaling processes or nodes, make sure to NOT use the local driver since it won't talk effectively between processes/nodes, and you should use a replicating driver like Redis (which is set by default).**
