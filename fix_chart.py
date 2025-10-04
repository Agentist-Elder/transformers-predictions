#!/usr/bin/env python3

# Read the original file
with open('/home/jarden/transformers-predictions/app.js', 'r') as f:
    lines = f.readlines()

# Read the new createChart function
with open('/home/jarden/transformers-predictions/app_chart_fix.js', 'r') as f:
    new_function = f.read()

# Find the createChart function boundaries
start_line = None
end_line = None
brace_count = 0
in_function = False

for i, line in enumerate(lines):
    if 'createChart(data) {' in line:
        start_line = i
        in_function = True
        brace_count = 1
        continue

    if in_function:
        brace_count += line.count('{') - line.count('}')
        if brace_count == 0:
            end_line = i
            break

if start_line is not None and end_line is not None:
    # Replace the function
    new_lines = lines[:start_line] + [new_function + '\n'] + lines[end_line+1:]

    # Write the result
    with open('/home/jarden/transformers-predictions/app.js', 'w') as f:
        f.writelines(new_lines)

    print(f"Replaced createChart function from line {start_line+1} to {end_line+1}")
else:
    print("Could not find createChart function")