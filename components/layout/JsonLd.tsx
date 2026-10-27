/**
 * One `<script type="application/ld+json">`. `<` is escaped so a title or
 * description containing `</script>` cannot close the tag early.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
