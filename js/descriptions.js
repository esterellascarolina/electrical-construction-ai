/* =========================================================
   Category descriptions, keyed by CSV field name.

   Used in two places by the app:
     1. Hover tooltips on bar labels and donut legend items
        (via the native HTML title attribute).
     2. Definition line in the drill-down header when a
        category is selected.

   ai_technique and digital_technology are intentionally
   omitted for now; their values are mostly self-explanatory
   for the target audience. To add them later, drop a new
   block of entries into the DESCRIPTIONS object below.
   Charts and drill-down headers pick them up automatically.
   ========================================================= */

window.AppDescriptions = window.AppDescriptions || {};

(function() {
  const DESCRIPTIONS = {
    electrical_scope: {
      'Building-wide':
        'Study covers building systems broadly, with electrical treated as one component among many.',
      'Electrical-only':
        'Study focuses specifically on electrical systems without coverage of mechanical or plumbing trades.',
      'MEP-wide':
        'Study covers mechanical, electrical, and plumbing trades together, typically in a coordination context.'
    },

    maturity_level: {
      'Conceptual':
        'An idea, framework, or theoretical approach without implementation or empirical validation.',
      'Lab-validated':
        'Implemented and tested under controlled conditions, with synthetic or limited real data.',
      'Field-tested':
        'Applied or evaluated on a real construction project or in an operational setting.'
    },

    construction_phase: {
      'Preconstruction':
        'Activities before physical work begins, including design, planning, estimating, and coordination.',
      'Execution':
        'The active construction or installation phase on site.',
      'Closeout or O&M':
        'Project handover activities and post-construction operations and maintenance.',
      'Multiple phases':
        'Work spans more than one phase of the project lifecycle.',
      'Not applicable':
        'Studies not situated in a construction project lifecycle. Most are about workforce training, education, or learning tools; the remaining one is a firm-level organizational study.'
    },

    pain_point_addressed: {
      'Coordination or clash detection':
        'Resolving spatial or functional conflicts between building systems before installation.',
      'Quality control':
        'Verifying installed work meets specifications and standards.',
      'VDC or BIM cost recovery':
        'Justifying the financial investment in Virtual Design and Construction or BIM tools and workflows.',
      'Commissioning or closeout':
        'Activities related to system startup, testing, handover, and turnover documentation.',
      'Organizational adoption of technology':
        'Challenges in integrating new technology into firm workflows and culture.',
      'Skilled labor shortage or training':
        'Workforce gaps and training needs in the electrical trade.',
      'Prefabrication feasibility':
        'Assessing whether components can be manufactured off-site for on-site assembly.',
      'Safety or electrocution or arc flash':
        'Protecting workers from electrical hazards during installation, energization, or maintenance.',
      'Labor productivity':
        'Improving the rate or efficiency of work output on site.',
      'RFI or change order management':
        'Handling Requests for Information and modifications to scope during construction.',
      'Cost estimation or takeoff':
        'Quantifying materials, labor, and overall project costs from design documents.',
      'NEC or code compliance':
        'Ensuring work meets the National Electrical Code or other regulatory standards.',
      'Scheduling':
        'Planning and sequencing of work activities over time.',
      'Material handling or logistics':
        'Movement, storage, and on-site management of construction materials.'
    }
  };

  // Return the full {label: description} map for one field, or
  // an empty object if the field has no descriptions defined.
  const getFieldDescriptions = (field) => DESCRIPTIONS[field] || {};

  // Look up one description by field + value. Returns null when
  // the field or the value is not in the dictionary.
  const getDescription = (field, value) => {
    const m = DESCRIPTIONS[field];
    return m ? (m[value] || null) : null;
  };

  window.AppDescriptions = {
    DESCRIPTIONS,
    getFieldDescriptions,
    getDescription
  };
})();