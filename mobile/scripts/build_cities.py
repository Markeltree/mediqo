"""Builds src/lib/cities.data.ts from GeoNames dumps (CC BY 4.0).

Download cities15000.zip, countryInfo.txt and admin1CodesASCII.txt from https://download.geonames.org/export/dump/
into one folder, then run: python scripts/build_cities.py <that folder> src/lib/cities.data.ts 150000
"""
import csv, io, json, sys, zipfile

src, out = sys.argv[1], sys.argv[2]
min_pop = int(sys.argv[3]) if len(sys.argv) > 3 else 200000

countries = {}
with open(f'{src}/countryInfo.txt', encoding='utf-8') as f:
    for line in f:
        if line.startswith('#'):
            continue
        cols = line.rstrip('\n').split('\t')
        if len(cols) > 4:
            countries[cols[0]] = cols[4]

admin1 = {}
with open(f'{src}/admin1CodesASCII.txt', encoding='utf-8') as f:
    for line in f:
        cols = line.rstrip('\n').split('\t')
        if len(cols) >= 2:
            admin1[cols[0]] = cols[1]

rows = []
with zipfile.ZipFile(f'{src}/cities15000.zip') as z:
    text = io.TextIOWrapper(z.open('cities15000.txt'), encoding='utf-8')
    for cols in csv.reader(text, delimiter='\t', quoting=csv.QUOTE_NONE):
        if len(cols) < 15:
            continue
        name, ascii_name, lat, lng, fclass, fcode, cc, a1, pop = cols[1], cols[2], cols[4], cols[5], cols[6], cols[7], cols[8], cols[10], cols[14]
        # Populated places only; skip districts/sections of a bigger city (PPLX) so each city appears once
        if fclass != 'P' or fcode in ('PPLX', 'PPLH', 'PPLQ', 'PPLW', 'PPLCH'):
            continue
        try:
            pop = int(pop); lat = round(float(lat), 3); lng = round(float(lng), 3)
        except ValueError:
            continue
        # Pakistan is the launch market, so its smaller cities stay in the list too
        if cc not in countries or pop < (100000 if cc == 'PK' else min_pop):
            continue
        region = admin1.get(f'{cc}.{a1}', '')
        row = [name, region if region != name else '', countries[cc], lat, lng, pop // 1000]
        if ascii_name and ascii_name != name:
            row.append(ascii_name)  # searchable spelling without accents, e.g. Sao Paulo
        rows.append(row)

rows.sort(key=lambda r: -r[5])
if out == '--stats':
    from collections import Counter
    print('cities', len(rows), 'countries', len(set(r[2] for r in rows)))
    print('approx KB', len(json.dumps(rows, ensure_ascii=False)) // 1024)
    print('top PK', [r[0] for r in rows if r[2] == 'Pakistan'][:40])
    sys.exit()

body = ',\n'.join(json.dumps(list(r), ensure_ascii=False) for r in rows)
with open(out, 'w', encoding='utf-8', newline='\n') as f:
    f.write('// Generated from GeoNames (https://www.geonames.org, CC BY 4.0): cities with at least '
            f'{min_pop:,} people (100,000 in Pakistan).\n'
            '// [name, region, country, latitude, longitude, population in thousands, ascii name if different], largest first.\n'
            '// Regenerate with the build_cities script instead of editing by hand.\n'
            'export const CITY_ROWS: [string, string, string, number, number, number, string?][] = [\n' + body + '\n];\n')
print('wrote', len(rows), 'cities')
