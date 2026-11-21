-- A quote has no payment terms of its own: it printed its template's as they
-- are now, so editing the template rewrote quotes already sent or accepted.
-- From now on they're frozen with its look (documents.template_style's
-- payment_terms) when it leaves DRAFT. A quote frozen before this gets its
-- template's terms as they are today - what it printed until now.

UPDATE documents d
SET template_style = d.template_style || jsonb_build_object('payment_terms', t.payment_terms)
FROM templates t
WHERE t.id = d.template_id
  AND t.company_id = d.company_id
  AND d.type = 'QUOTE'
  AND d.template_style IS NOT NULL
  AND NOT (d.template_style ? 'payment_terms');
