<script setup>
import { ref } from 'vue';
import { PDFDocument } from 'pdf-lib';

const files = ref([]);
const newPdfUrl = ref('');

const processPDFs = async () => {
    try {
        const loadedDocs = await Promise.all(
            files.value.map(async file => {
                try {
                    const fileData = new Uint8Array(await file.arrayBuffer());
                    return await PDFDocument.load(fileData);
                } catch (error) {
                    console.error('Failed to load PDF:', error);
                    return null; // Returning null for corrupted files
                }
            })
        );

        const newPdfDoc = await PDFDocument.create();
        
        for (const doc of loadedDocs) {
            if (doc) { // Check if the doc is not null (corrupted)
                const [firstPage] = await newPdfDoc.copyPages(doc, [0]);
                newPdfDoc.addPage(firstPage);
            }
        }

        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        newPdfUrl.value = URL.createObjectURL(blob);
    } catch (error) {
        console.error('Error processing PDFs:', error);
    }
};
</script>

<template>
  <div>
    <input type="file" multiple accept="application/pdf" @change="files = [...$event.target.files]" />
    <button @click="processPDFs">Generate PDF</button>
    <a v-if="newPdfUrl" :href="newPdfUrl" download="combined.pdf">Download Combined PDF</a>
  </div>
</template>

<style scoped>
/* Add your styling here */
</style>
