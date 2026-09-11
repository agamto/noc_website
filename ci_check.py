import yaml

with open('.github/workflows/ci.yml') as fh:
    doc = yaml.safe_load(fh)

jobs = doc['jobs']
print('jobs:', list(jobs))
for name, job in jobs.items():
    print(' ', name, '| needs =', job.get('needs'), '| if =', job.get('if'))

print('\nchanges outputs:', jobs['changes']['outputs'])
print('\nbuild conditional steps:')
for step in jobs['build']['steps']:
    if 'if' in step:
        print('  -', step.get('name'), '=>', step['if'])
