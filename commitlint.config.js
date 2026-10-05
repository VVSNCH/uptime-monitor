export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'api',
        'worker',
        'gateway',
        'web',
        'shared',
        'database',
        'registry',
        'common',
        'infra',
        'deps',
      ],
    ],
  },
}
