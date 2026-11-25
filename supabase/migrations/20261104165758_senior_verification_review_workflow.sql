/*
# Senior citizen verification review workflow

1. Modified Tables
- `senior_verifications`: table privileges tightened. Anonymous visitors get no access. Signed-in users can read and create their own requests only. Nobody edits or deletes a request directly.

2. New Functions
- `admin_review_senior_verification(p_verification_id, p_decision, p_remarks)`: lets a Temple Admin approve or reject a pending senior verification for a temple they actively administer. Records the reviewer, review time and remarks on the request. Rejections require a remark.

3. Security
- Only signed-in Temple Admins for the request's temple can review it.
- Reviews are allowed only while the request is pending, so a decision cannot be changed silently.
- The function is not callable by anonymous visitors.

4. Notes
- The review fields on the request act as the audit record for each decision.
*/

REVOKE ALL ON senior_verifications FROM anon;
REVOKE UPDATE, DELETE ON senior_verifications FROM authenticated;
GRANT SELECT, INSERT ON senior_verifications TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_senior_verification(
  p_verification_id uuid,
  p_decision text,
  p_remarks text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row senior_verifications%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please sign in');
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid decision');
  END IF;

  IF p_decision = 'rejected' AND (p_remarks IS NULL OR btrim(p_remarks) = '') THEN
    RETURN jsonb_build_object('success', false, 'error', 'A reason is required to reject');
  END IF;

  SELECT * INTO v_row FROM senior_verifications WHERE id = p_verification_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Verification not found');
  END IF;

  IF NOT public.is_temple_admin(v_row.temple_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized for this temple');
  END IF;

  IF v_row.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This request has already been reviewed');
  END IF;

  UPDATE senior_verifications
  SET status = p_decision,
      admin_remarks = NULLIF(btrim(p_remarks), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_verification_id;

  RETURN jsonb_build_object('success', true, 'status', p_decision);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_review_senior_verification(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_senior_verification(uuid, text, text) TO authenticated;
