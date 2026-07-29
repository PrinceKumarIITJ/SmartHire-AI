from typing import Dict, Any, List
from langchain_core.prompts import ChatPromptTemplate
from backend.app.services.vector_store import faiss_store
from backend.app.services.llm_factory import get_llm
import logging

logger = logging.getLogger("smarthire.agents.chat_agent")

CHAT_RAG_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are SmartHire Assistant, an AI recruitment intelligence chatbot.
Answer the recruiter's question about candidate '{candidate_name}' strictly based on the provided resume context chunks.
If the context does not contain sufficient details to answer, state clearly that the resume does not specify that information.
Always cite specific sections/chunks in your answer."""),
    ("user", "Retrieved Resume Context Chunks:\n{context_chunks}\n\nRecruiter Question:\n{user_question}")
])

async def run_chat_agent(
    candidate_id: str,
    candidate_name: str,
    user_question: str
) -> Dict[str, Any]:
    """
    Chat Agent: Performs RAG search over FAISS candidate resume chunks and generates a grounded response.
    """
    logger.info(f"Executing Chat Agent for candidate {candidate_name} ({candidate_id})...")

    # Retrieve top-k chunks from FAISS
    chunks_with_scores = faiss_store.similarity_search_candidate(
        candidate_id=candidate_id,
        query=user_question,
        top_k=4
    )

    if not chunks_with_scores:
        formatted_context = "No relevant resume context chunks found."
        citations = []
    else:
        context_parts = []
        citations = []
        for i, (text, score) in enumerate(chunks_with_scores, 1):
            context_parts.append(f"[Chunk {i}] (Relevance: {score:.2f}):\n{text}")
            citations.append(f"Chunk {i} (Similarity: {score:.2f})")
        formatted_context = "\n\n".join(context_parts)

    llm = get_llm()
    chain = CHAT_RAG_PROMPT | llm

    input_vars = {
        "candidate_name": candidate_name,
        "context_chunks": formatted_context,
        "user_question": user_question
    }

    try:
        res = await chain.ainvoke(input_vars)
        answer_text = res.content
    except Exception as e:
        logger.warning(f"Async LLM call failed in Chat Agent: {e}. Trying sync invoke...")
        res = chain.invoke(input_vars)
        answer_text = res.content

    return {
        "answer": answer_text,
        "citations": citations,
        "chunks_used": [text for text, _ in chunks_with_scores]
    }
