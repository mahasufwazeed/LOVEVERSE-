#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "LVTypes.h"
#include "LoveVerseEmotionComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FLVEmotionChanged, ELVFacialExpression, Expression);

UCLASS(ClassGroup=(LoveVerse), meta=(BlueprintSpawnableComponent))
class LOVEVERSEUNREAL_API ULoveVerseEmotionComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    ULoveVerseEmotionComponent();

    UFUNCTION(BlueprintCallable, Category = "LoveVerse|Emotion")
    void SetExpression(ELVFacialExpression NewExpression);

    UFUNCTION(BlueprintPure, Category = "LoveVerse|Emotion")
    ELVFacialExpression GetExpression() const { return Expression; }

    UPROPERTY(BlueprintAssignable, Category = "LoveVerse|Emotion")
    FLVEmotionChanged OnExpressionChanged;

protected:
    virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

    UFUNCTION(Server, Reliable)
    void ServerSetExpression(ELVFacialExpression NewExpression);

private:
    UPROPERTY(ReplicatedUsing=OnRep_Expression)
    ELVFacialExpression Expression = ELVFacialExpression::Happy;

    UFUNCTION()
    void OnRep_Expression();

    void ApplyExpression(ELVFacialExpression NewExpression);
};
