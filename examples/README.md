# Survey Data Mapper Example

Run the app in a terminal first:

```bash
slack run
```

And then, you can generate a webhook trigger in a different terminal, and run
the workflow via the URL:

```bash
slack trigger create --trigger-def ./triggers/survey_webhook.ts
curl -XPOST https://hooks.slack.com/triggers/T12345/...
```
