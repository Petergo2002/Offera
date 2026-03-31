BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_proposal_sections_legacy(sections_json JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN jsonb_typeof(section_value) <> 'object' THEN section_value
        ELSE jsonb_set(
          section_value,
          '{blocks}',
          COALESCE((
            SELECT jsonb_agg(
              CASE
                WHEN COALESCE(block_value->>'type', '') <> 'pricing' THEN block_value
                ELSE jsonb_set(
                  block_value,
                  '{rows}',
                  COALESCE((
                    SELECT jsonb_agg(
                      CASE
                        WHEN jsonb_typeof(row_value) <> 'object' THEN row_value
                        WHEN row_value ? 'type' THEN row_value
                        ELSE row_value || jsonb_build_object('type', 'one_time')
                      END
                    )
                    FROM jsonb_array_elements(
                      CASE
                        WHEN jsonb_typeof(block_value->'rows') = 'array'
                          THEN block_value->'rows'
                        ELSE '[]'::jsonb
                      END
                    ) AS row_item(row_value)
                  ), '[]'::jsonb),
                  true
                )
              END
            )
            FROM jsonb_array_elements(
              CASE
                WHEN jsonb_typeof(section_value->'blocks') = 'array'
                  THEN section_value->'blocks'
                ELSE '[]'::jsonb
              END
            ) AS block_item(block_value)
          ), '[]'::jsonb),
          true
        )
      END
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(sections_json) = 'array' THEN sections_json
      ELSE '[]'::jsonb
    END
  ) AS section_item(section_value);
$$;

UPDATE public.proposals
SET sections = public.normalize_proposal_sections_legacy(sections)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(sections) = 'array' THEN sections
      ELSE '[]'::jsonb
    END
  ) AS section_item(section_value),
  jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(section_value->'blocks') = 'array'
        THEN section_value->'blocks'
      ELSE '[]'::jsonb
    END
  ) AS block_item(block_value),
  jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(block_value->'rows') = 'array'
        THEN block_value->'rows'
      ELSE '[]'::jsonb
    END
  ) AS row_item(row_value)
  WHERE COALESCE(block_value->>'type', '') = 'pricing'
    AND jsonb_typeof(row_value) = 'object'
    AND NOT (row_value ? 'type')
);

UPDATE public.templates
SET sections = public.normalize_proposal_sections_legacy(sections)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(sections) = 'array' THEN sections
      ELSE '[]'::jsonb
    END
  ) AS section_item(section_value),
  jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(section_value->'blocks') = 'array'
        THEN section_value->'blocks'
      ELSE '[]'::jsonb
    END
  ) AS block_item(block_value),
  jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(block_value->'rows') = 'array'
        THEN block_value->'rows'
      ELSE '[]'::jsonb
    END
  ) AS row_item(row_value)
  WHERE COALESCE(block_value->>'type', '') = 'pricing'
    AND jsonb_typeof(row_value) = 'object'
    AND NOT (row_value ? 'type')
);

UPDATE public.proposal_revisions
SET snapshot = jsonb_set(
  snapshot,
  '{sections}',
  public.normalize_proposal_sections_legacy(snapshot->'sections'),
  true
)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(snapshot->'sections') = 'array' THEN snapshot->'sections'
      ELSE '[]'::jsonb
    END
  ) AS section_item(section_value),
  jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(section_value->'blocks') = 'array'
        THEN section_value->'blocks'
      ELSE '[]'::jsonb
    END
  ) AS block_item(block_value),
  jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(block_value->'rows') = 'array'
        THEN block_value->'rows'
      ELSE '[]'::jsonb
    END
  ) AS row_item(row_value)
  WHERE COALESCE(block_value->>'type', '') = 'pricing'
    AND jsonb_typeof(row_value) = 'object'
    AND NOT (row_value ? 'type')
);

COMMIT;
