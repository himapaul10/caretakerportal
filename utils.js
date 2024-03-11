const mapMedicationData = (data) => {
    return data.results.map(med => ({
        id: med.id,
        dosage_form: med.dosage_form,
        brand_name: med.openfda.brand_name[0],
        generic_name: med.openfda.generic_name[0],
        manufacturer_name: med.openfda.manufacturer_name[0],
        route: med.openfda.route[0],
        product_ndc: med.openfda.product_ndc,
    }));
};

module.exports = {
    mapMedicationData,
};