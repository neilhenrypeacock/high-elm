# UTM naming convention — The Safari Edit landing page

Decided 3 Aug 2026. Follow it exactly; the value of a convention is entirely in
being boring and consistent.

## The URL to put in every Meta ad

```
https://go.thesafariedit.com/?utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
```

Paste that into the **Website URL** field of the ad. The `{{...}}` parts are
Meta's own dynamic parameters — Meta swaps in the real values when the ad is
served, so this one URL works for every ad and there is nothing to update by
hand. Nothing to fill in yourself.

| Field | Value | What it gives you |
|---|---|---|
| `utm_source` | `{{site_source_name}}` | Where the click came from: `fb`, `ig`, `an`, `msg`. Meta fills this in. |
| `utm_medium` | `paid_social` | Fixed. Separates paid social from any future email or organic links. |
| `utm_campaign` | `{{campaign.name}}` | Your campaign name, as typed in Ads Manager. |
| `utm_content` | `{{ad.name}}` | The individual ad — which creative actually produced the enquiry. |

`fbclid` is captured automatically as well; you don't add it.

## Naming things in Ads Manager

Because `utm_campaign` and `utm_content` copy your Ads Manager names verbatim,
those names ARE your data. A sloppy ad name is a sloppy Sheet column forever.

**Three hard rules**
1. **Lower case only.** `Honeymoon` and `honeymoon` become two different rows.
2. **No spaces.** They arrive as `%20` and make the Sheet unreadable. Use
   hyphens inside a word-group, underscores between groups.
3. **No commas.** They break exports and anything opened as CSV.

**The patterns**

| Level | Pattern | Example |
|---|---|---|
| Campaign | `tse_<theme>_<objective>_<yyyy-mm>` | `tse_honeymoon_leads_2026-08` |
| Ad set | `<audience>_<geo>_<age>` | `engaged-women_uk_25-44` |
| Ad | `<format>_<hook>_<version>` | `video_lion-dawn_v1` |

Keep the month in the campaign name. When you run the same theme again in
October you get a clean break rather than two periods blurred into one row.

Version every ad (`v1`, `v2`). The moment you change an image or a headline it
is a new ad — reusing the name silently merges the performance of two different
creatives, and you lose the ability to say which one worked.

## Why ad set isn't in the URL

There are only four UTM fields captured, and knowing the exact ad matters more
than knowing the ad set — every ad belongs to exactly one ad set, so you can
always recover the ad set from Ads Manager. Spending a field on it would cost
more than it returns.

If that stops being true, adding `utm_term` means a small code change here AND a
new column in the Google Sheet, whose header must match the name exactly.

## Checking it worked

After the first day of spend, open the Sheet. Every row should have all four
UTM columns filled. If `utm_source` is blank the link was pasted without the
parameters; if it reads literally `{{site_source_name}}` then the dynamic
parameter wasn't recognised — usually because it was typed by hand rather than
copied, or the ad uses the "Display Link" field instead of the real URL.
