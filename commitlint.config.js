export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "body-max-line-length": [0], // Disabled - no character limit on commit body lines
  },
};
