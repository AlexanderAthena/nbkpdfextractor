<script setup>
import { ref } from 'vue';
import { PDFDocument } from 'pdf-lib';

const files = ref([]);
const newPdfUrl = ref('');
const corruptedFiles = ref([]);
const remainingCount = ref(0);

const processPDFs = async () => {
    remainingCount.value = files.value.length; // Initialize the countdown
    corruptedFiles.value = []; // Reset corrupted files list

    const loadedDocs = await Promise.all(
        files.value.map(async file => {
            try {
                const fileData = new Uint8Array(await file.arrayBuffer());
                const doc = await PDFDocument.load(fileData);
                remainingCount.value--; // Decrease countdown on successful or failed load
                return doc;
            } catch (error) {
                console.error('Failed to load PDF:', error);
                corruptedFiles.value.push(file.name); // Add to corrupted files list
                remainingCount.value--; // Decrease countdown on successful or failed load
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
};
</script>

<template>
  <div>
    <input type="file" multiple accept="application/pdf" @change="files = [...$event.target.files]" />
    <button @click="processPDFs">Generate PDF</button>
    <p v-if="remainingCount">Files remaining: {{ remainingCount }}</p>
    <a v-if="newPdfUrl" :href="newPdfUrl" download="combined.pdf">Download Combined PDF</a>
    <ul v-if="corruptedFiles.length > 0">
      <li v-for="file in corruptedFiles" :key="file">Corrupted: {{ file }}</li>
    </ul>
  </div>
</template>

<style scoped>
/* Add your styling here */
</style>
